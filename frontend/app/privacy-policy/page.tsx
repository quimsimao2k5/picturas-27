import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-10 space-y-10">
      <h1 className="font-bold text-6xl text-primary font-title w-full text-center">
        PictuRAS
      </h1>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-2">Your Information</h2>
              <p className="text-muted-foreground">
                We only collect what we need to make PictuRAS work for you, like
                your email when you sign up or the images you upload. Your data
                belongs to you—we just use it to provide and improve our
                services.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">Image Processing</h2>
              <p className="text-muted-foreground">
                Images you upload are processed to apply the edits you request.
                We don’t use your images for anything else, and they’re deleted
                shortly after processing (unless you save them to your account).
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">Data Security</h2>
              <p className="text-muted-foreground">
                We take security seriously and use modern tools to protect your
                information. While we do our best, no system is 100% foolproof,
                so please use strong passwords and keep your account secure.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">
                Third-Party Services
              </h2>
              <p className="text-muted-foreground">
                Some features of PictuRAS rely on trusted third-party tools
                (e.g., for AI processing). These services only get the data they
                need to work and are bound by their own privacy policies.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">Cookies</h2>
              <p className="text-muted-foreground">
                Like most apps, we use cookies to make PictuRAS better. They
                help us remember your preferences and improve your experience.
                You can disable cookies in your browser, but some features might
                not work as well.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-2">Your Control</h2>
              <p className="text-muted-foreground">
                You’re in charge! Want to delete your account or data? Just let
                us know, and we’ll handle it. For questions or requests, reach
                out to us at{" "}
                <a href="mailto:support@picturas.com" className="text-primary">
                  support@picturas.com
                </a>
                .
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
