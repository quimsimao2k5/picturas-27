"""Frame extraction parameters and sampling limits (no FFmpeg)."""
import pytest

from frame_extraction import InvalidExtraction, sampling_times, validate_params


@pytest.mark.parametrize("params", [
    {"count": True}, {"count": 0}, {"count": 101}, {"count": 1.5}, {"count": "6"},
    {"count": float("nan")}, {"count": float("inf")},
    {"mode": "interval", "interval": 0}, {"mode": "interval", "interval": -1},
    {"mode": "interval", "interval": True}, {"mode": "interval", "interval": "2"},
    {"mode": "interval", "interval": float("nan")},
    {"mode": "interval", "interval": float("inf")}, {"mode": "invalid"}, {"format": "gif"},
])
def test_invalid_parameters(params):
    with pytest.raises(InvalidExtraction):
        validate_params(params)


def test_interval_resource_limit_and_boundaries():
    times, _ = sampling_times({"mode": "interval", "interval": 0.04}, 4, 25)
    assert len(times) == 100 and times[-1] < 4
    with pytest.raises(InvalidExtraction, match="more than 100"):
        sampling_times({"mode": "interval", "interval": 0.001}, 4, 25)
    assert sampling_times({"mode": "interval", "interval": 10}, 4, 25)[0] == [0]


@pytest.mark.parametrize("params", [None, False, [], "count"])
def test_invalid_parameter_container(params):
    with pytest.raises(InvalidExtraction):
        validate_params(params)
