import os
import boto3
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

load_dotenv()


def send_ses_email(
    subject, body_text, body_html, sender_email, recipient_emails, attachment=None
):
    # Create a multipart/mixed parent container
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = ", ".join(recipient_emails)

    # Add body to email
    msg_body = MIMEMultipart("alternative")
    textpart = MIMEText(body_text.encode("utf-8"), "plain", "utf-8")
    htmlpart = MIMEText(body_html.encode("utf-8"), "html", "utf-8")

    msg_body.attach(textpart)
    msg_body.attach(htmlpart)
    msg.attach(msg_body)

    # Attachment
    if attachment:
        with open(attachment, "rb") as f:
            part = MIMEApplication(f.read())
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=os.path.basename(attachment),
            )
            msg.attach(part)

    # Connect to AWS SES
    client = boto3.client(
        "ses",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
    )

    # Try to send the email.
    try:
        response = client.send_raw_email(
            Source=sender_email,
            Destinations=recipient_emails,
            RawMessage={"Data": msg.as_string()},
        )
    except Exception as e:
        print(e)
        return False
    return True


if __name__ == "__main__":

    subject = "Your magic link to log in to Atlas"
    body_text = "Content of your email."
    body_html = """<html>
    <head></head>
    <body>
    <h1>Welcome to Atlas!</h1>
    <p>Click <a href='https://atlas.scaledhumanity.org'>here</a> to log in</p>
    </body>
    </html>"""
    sender_email = "noreply@scaledhumanity.org"
    recipient_emails = ["nakhaeiamirhossein@gmail.com"]

    # Send the email
    send_ses_email(subject, body_text, body_html, sender_email, recipient_emails)
