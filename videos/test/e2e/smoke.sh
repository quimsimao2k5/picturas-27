#!/usr/bin/env bash
# End-to-end smoke test of the Video Library (UC-VID-002) through the real
# stack: nginx -> api_gateway -> videos -> SeaweedFS / users.
#
# Usage (with `docker compose up` running):
#   ./videos/test/e2e/smoke.sh [https://localhost:8080]
# Requires: curl, node, ffmpeg.
set -euo pipefail

BASE="${1:-https://localhost:8080}/api-gateway"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASS=0; FAIL=0

json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log($1)})"; }
check() { # name expected actual
  if [ "$2" == "$3" ]; then echo "  ok   $1"; PASS=$((PASS+1)); else echo "  FAIL $1 (expected $2, got $3)"; FAIL=$((FAIL+1)); fi
}
req() { # method url token [extra curl args...] -> prints HTTP status, body in $TMP/body
  local m="$1" u="$2" t="$3"; shift 3
  curl -sk -o "$TMP/body" -w "%{http_code}" -X "$m" "$BASE$u" -H "Authorization: Bearer $t" "$@"
}
register() { # type -> "id token"
  local email="smoke-$(date +%s)-$RANDOM$RANDOM-$$@test.local"
  local body
  if [ "$1" == "anonymous" ]; then body='{"type":"anonymous"}'; else
    body="{\"name\":\"Smoke\",\"email\":\"$email\",\"password\":\"smoke-password-1\",\"type\":\"$1\"}"; fi
  curl -sk -X POST "$BASE/users/" -H "Content-Type: application/json" -d "$body" | json 'o.user._id+" "+o.jwt'
}

echo "Generating test videos..."
ffmpeg -v error -y -f lavfi -i testsrc=size=320x240:rate=25 -f lavfi -i sine -t 2 \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac "$TMP/ok.mp4"
ffmpeg -v error -y -f lavfi -i testsrc=size=320x240:rate=25 -t 1 -c:v mpeg4 "$TMP/mpeg4.mp4"

read -r ALICE ALICE_T <<<"$(register free)"
read -r BOB BOB_T <<<"$(register free)"
read -r ANON ANON_T <<<"$(register anonymous)"

echo "E1 - anonymous"
check "REQ-VID-LIB-049 anonymous library -> 403" 403 "$(req GET "/videos/$ANON" "$ANON_T")"
check "REQ-VID-LIB-049 no token -> 401" 401 "$(curl -sk -o /dev/null -w '%{http_code}' "$BASE/videos/$ALICE")"

echo "Step 1"
check "REQ-VID-LIB-001 registered library -> 200" 200 "$(req GET "/videos/$ALICE" "$ALICE_T")"
check "REQ-VID-LIB-002 storage limit 500 MB" 524288000 "$(json o.storage.limitBytes < "$TMP/body")"

echo "Step 4 (E2/E3)"
check "REQ-VID-LIB-050 .avi -> 415" 415 "$(req POST "/videos/$ALICE" "$ALICE_T" -H 'Content-Type: application/json' -d '{"fileName":"a.avi","sizeBytes":10}')"
check "REQ-VID-LIB-015 120 MB -> 413" 413 "$(req POST "/videos/$ALICE" "$ALICE_T" -H 'Content-Type: application/json' -d '{"fileName":"a.mp4","sizeBytes":125829120}')"

upload() { # file -> prints final HTTP status; video id in $TMP/id
  local size; size=$(stat -c%s "$1" 2>/dev/null || stat -f%z "$1")
  req POST "/videos/$ALICE" "$ALICE_T" -H 'Content-Type: application/json' \
    -d "{\"fileName\":\"$(basename "$1")\",\"sizeBytes\":$size,\"mimeType\":\"video/mp4\"}" >/dev/null
  json o._id < "$TMP/body" > "$TMP/id"
  req PUT "/videos/$ALICE/$(cat "$TMP/id")/content" "$ALICE_T" \
    -H 'Content-Type: application/octet-stream' --data-binary "@$1"
}

echo "Steps 5-8"
check "REQ-VID-LIB-029 valid video -> 200 available" 200 "$(upload "$TMP/ok.mp4")"
OK_ID="$(cat "$TMP/id")"
check "REQ-VID-LIB-023 resolution registered" "320x240" "$(json 'o.width+"x"+o.height' < "$TMP/body")"
check "REQ-VID-LIB-051 MPEG-4 video -> 422 rejected" 422 "$(upload "$TMP/mpeg4.mp4")"
BAD_ID="$(cat "$TMP/id")"
req GET "/videos/$ALICE" "$ALICE_T" >/dev/null
check "REQ-VID-LIB-030 list has 1 available video" 1 "$(json o.videos.length < "$TMP/body")"
check "REQ-VID-LIB-061 recent panel shows the rejection" unsupported_video_codec "$(json o.recent[0].rejection.code < "$TMP/body")"

echo "Isolation"
check "REQ-VID-LIB-032 Bob reads Alice's video via his own URL -> 403" 403 "$(req GET "/videos/$BOB/$OK_ID" "$BOB_T")"
check "REQ-VID-LIB-032 Bob uses Alice's URL -> 401" 401 "$(req GET "/videos/$ALICE/$OK_ID" "$BOB_T")"
check "REQ-VID-LIB-033 Bob deletes Alice's video -> 403" 403 "$(req DELETE "/videos/$BOB/$OK_ID" "$BOB_T")"

echo "FA7 / FA5"
check "REQ-VID-LIB-062 dismiss rejected -> 204" 204 "$(req POST "/videos/$ALICE/$BAD_ID/dismiss" "$ALICE_T")"
check "REQ-VID-LIB-057 delete available -> 204" 204 "$(req DELETE "/videos/$ALICE/$OK_ID" "$ALICE_T")"
req GET "/videos/$ALICE" "$ALICE_T" >/dev/null
check "REQ-VID-LIB-057 space freed" 0 "$(json o.storage.usedBytes < "$TMP/body")"

echo "RN13 - account deletion"
check "upload before deleting the account -> 200" 200 "$(upload "$TMP/ok.mp4")"
VID="$(cat "$TMP/id")"

echo "UC-VID-003 - playback"
play() { req POST "/videos/$1/$2/playback" "$3" -H 'Content-Type: application/json' -d "{\"clientId\":\"$4\"}"; }
check "REQ-VID-PLAY-030 anonymous playback -> 403" 403 "$(play "$ANON" "$VID" "$ANON_T" anon)"
check "REQ-VID-PLAY-029 Bob plays Alice's video -> 403" 403 "$(play "$BOB" "$VID" "$BOB_T" bob)"
check "REQ-VID-PLAY-005 owner starts playback -> 201" 201 "$(play "$ALICE" "$VID" "$ALICE_T" laptop)"
URL="$(json o.url < "$TMP/body")"; SID="$(json o.sessionId < "$TMP/body")"
check "REQ-VID-PLAY-006 Range request on the signed URL -> 206" 206 \
  "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-99' "$URL")"
TAMPERED="$(node -e "const u=process.argv[1];const i=u.lastIndexOf('Signature=')+10;const c=u[i]==='A'?'B':'A';console.log(u.slice(0,i)+c+u.slice(i+1))" "$URL")"
check "REQ-VID-PLAY-047 tampered signature -> 403" 403 "$(curl -sk -o /dev/null -w '%{http_code}' "$TAMPERED")"
check "REQ-VID-PLAY-039 2nd stream of a Registered user -> 429" 429 "$(play "$ALICE" "$VID" "$ALICE_T" phone)"
check "REQ-VID-PLAY-055 heartbeat -> 204" 204 "$(req POST "/videos/$ALICE/playback/$SID/heartbeat" "$ALICE_T")"
check "REQ-VID-PLAY-021 renew -> 200" 200 "$(req POST "/videos/$ALICE/playback/$SID/renew" "$ALICE_T")"
check "REQ-VID-PLAY-056 same browser reclaims -> 201" 201 "$(play "$ALICE" "$VID" "$ALICE_T" laptop)"
SID2="$(json o.sessionId < "$TMP/body")"
check "REQ-VID-PLAY-056 replaced session ended -> 410" 410 "$(req POST "/videos/$ALICE/playback/$SID/heartbeat" "$ALICE_T")"
check "REQ-VID-PLAY-055 close the player -> 204" 204 "$(req DELETE "/videos/$ALICE/playback/$SID2" "$ALICE_T")"
check "REQ-VID-PLAY-055 another device can play now -> 201" 201 "$(play "$ALICE" "$VID" "$ALICE_T" phone)"
check "REQ-VID-PLAY-053 expired/invalid JWT on renew -> 401" 401 "$(req POST "/videos/$ALICE/playback/$SID2/renew" "invalid.jwt.token")"

echo "UC-VID-001 - trim"
trim() { req POST "/videos/$ALICE/$VID/trims" "$ALICE_T" -H 'Content-Type: application/json' -d "$1"; }
check "REQ-VID-TRIM-036 eligibility of an available H.264 video -> 200" 200 "$(req GET "/videos/$ALICE/$VID/trim-eligibility" "$ALICE_T")"
check "REQ-VID-TRIM-038 start after end -> 400" 400 "$(trim '{"startSec":1,"endSec":0}')"
check "REQ-VID-TRIM-026 whole video without confirmation -> 409" 409 "$(trim '{"startSec":0,"endSec":2}')"
check "REQ-VID-TRIM-014 create trim -> 201 queued" 201 "$(trim '{"startSec":0,"endSec":1,"name":"smoke_cut"}')"
JOB="$(json o._id < "$TMP/body")"
STATUS=""
for _ in $(seq 1 60); do
  req GET "/videos/$ALICE/trims/$JOB" "$ALICE_T" >/dev/null
  STATUS="$(json o.status < "$TMP/body")"
  [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ] && break
  sleep 1
done
check "REQ-VID-TRIM-021 trim completed" completed "$STATUS"
RESULT="$(json o.resultVideoId < "$TMP/body")"
req GET "/videos/$ALICE/$RESULT" "$ALICE_T" >/dev/null
check "REQ-VID-TRIM-009/020 result in the library with the chosen name" "smoke_cut available" "$(json 'o.name+" "+o.status' < "$TMP/body")"
check "REQ-VID-TRIM-025 download URL -> 200" 200 "$(req POST "/videos/$ALICE/$RESULT/download" "$ALICE_T")"
check "REQ-VID-TRIM-025 downloaded file readable (Range 206)" 206 \
  "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-99' "$(json o.url < "$TMP/body")")"
check "REQ-VID-TRIM-029 cancel a completed trim -> 409" 409 "$(req POST "/videos/$ALICE/trims/$JOB/cancel" "$ALICE_T")"
check "REQ-VID-TRIM-059 Bob reads Alice's trim -> 403" 403 "$(req GET "/videos/$BOB/trims/$JOB" "$BOB_T")"
check "delete Alice's account -> 204" 204 "$(req DELETE "/users/$ALICE" "$ALICE_T")"
if command -v docker >/dev/null 2>&1; then
  sleep 1
  LEFT="$(docker compose exec -T videos_mongoDB mongo --quiet --port 27020 videos \
    --eval "db.videos.count({userId:'$ALICE'})" 2>/dev/null | tr -d '[:space:]')"
  check "RN13 no videos left for the deleted account" 0 "$LEFT"
fi

echo
echo "passed: $PASS  failed: $FAIL"
[ "$FAIL" -eq 0 ]
