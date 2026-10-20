import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsOfService() {
  return (
    <div className="container mx-auto py-10 space-y-10">
      <h1 className="font-bold text-6xl text-primary font-title w-full text-center">
        PictuRAS
      </h1>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Terms Of Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-2">Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to PictuRAS! By using our app, you agree to these terms,
                so please give them a read. If you don’t agree, that’s okay—you
                just can’t use the app.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                What PictuRAS Is About
              </h2>
              <p className="text-muted-foreground">
                PictuRAS is a web app for editing images and having fun with
                creative tools. Whether you{"'"}re tweaking photos, applying
                effects, or using advanced features like AI-based tools, we’re
                here to make it easy and enjoyable.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">User Accounts</h2>
              <span className="text-muted-foreground space-y-2">
                <p>We’ve got three user tiers:</p>
                <ol className="list-decimal pl-8">
                  <li>
                    <b>Guest:</b> Basic access to limited features and small
                    images.
                  </li>
                  <li>
                    <b>Free Registered Users:</b> More tools but with daily
                    usage caps.
                  </li>
                  <li>
                    <b>Premium Users:</b> Full access without limits (because
                    you’re awesome!).
                  </li>
                </ol>
                <p>
                  Please don’t share your account with others—it’s yours alone!
                </p>
              </span>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                Your Content, Your Responsibility
              </h2>
              <p className="text-muted-foreground">
                When you upload an image, it’s your responsibility to make sure
                you have the rights to use it. We don’t own your content, but we
                might need to process it (e.g., resize it, analyze it, etc.) so
                the app can work. We promise we won’t use your content for
                anything else.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">No Funny Business</h2>
              <span className="text-muted-foreground space-y-2">
                <p>Keep things respectful. Don’t use PictuRAS to:</p>
                <ol className="list-decimal pl-8">
                  <li>Upload illegal or harmful content.</li>
                  <li>Violate someone’s rights.</li>
                  <li>Overload our servers with a gazillion edits at once.</li>
                </ol>
                <p>
                  If you break these rules, we might have to suspend or delete
                  your account.
                </p>
              </span>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                How We Keep Things Running
              </h2>
              <p className="text-muted-foreground">
                We do our best to keep PictuRAS online 24/7, but sometimes
                things happen—updates, server issues, or a dinosaur stepping on
                the server cables. We’re not responsible if the app isn’t
                available when you need it, but we’ll work quickly to fix any
                problems.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                Premium Subscriptions
              </h2>
              <p className="text-muted-foreground">
                If you go premium, thank you! Payments are non-refundable, but
                you can cancel anytime, and you’ll still have access until the
                end of your billing period.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">Advanced Tools</h2>
              <p className="text-muted-foreground">
                Some features, like AI-powered tools or batch processing, are
                pretty cool but might have their quirks. Results might not
                always be perfect—thanks for being understanding as we continue
                improving.{" "}
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                Privacy and Security
              </h2>
              <p className="text-muted-foreground">
                We care about your data and will do our best to keep it safe.
                Check out our Privacy Policy for details on how we handle your
                information.{" "}
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                Changes to These Terms
              </h2>
              <p className="text-muted-foreground">
                We might update these terms from time to time. If we do, we’ll
                let you know by posting the changes here. Keep using the app
                after that, and it means you’re okay with the updates.{" "}
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">Questions?</h2>
              <p className="text-muted-foreground">
                If you’ve got any questions or feedback, hit us up at{" "}
                <a href="mailto:support@picturas.com" className="text-primary">
                  support@picturas.com
                </a>
                . We love hearing from you!{" "}
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
