"""
This module is responsible for sending emails to users.
"""

import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import boto3
from boto3.exceptions import Boto3Error
from dotenv import load_dotenv
from jinja2 import Template

from sanic import Sanic


load_dotenv()


def send_ses_email(
    subject, body_text, body_html, sender_email, recipient_emails, attachment=None
):
    """
    Send an email using AWS SES.
    """
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
        _response = client.send_raw_email(
            Source=sender_email,
            Destinations=recipient_emails,
            RawMessage={"Data": msg.as_string()},
        )

    except Boto3Error as e:
        print(e)
        return False
    return True


def send_magic_link(email: str, token: str):
    """
    Send a magic link to the user's email.
    """
    app = Sanic.get_app("Atlas")

    subject = "Your link to Atlas!"
    body_text = "Please click the link below to sign in to your account."

    body_html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Link</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <img src="https://atlas.seas.upenn.edu/logo.svg" alt="Atlas" width="60" style="display: block;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px 0; text-align: center;">Your Login Link</h1>
                            
                            <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                Welcome to Atlas!
                            </p>
                            
                            <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                                Please click the magic link below to sign in to your account.
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td style="border-radius: 4px; background-color: #000000;">
                                        <a href="{{ link }}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 4px;">
                                            Sign In to Atlas
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999999; font-size: 14px; line-height: 20px; margin: 30px 0 0 0;">
                                If you're on a mobile device, you can also copy the link below:
                            </p>
                            
                            <p style="color: #666666; font-size: 12px; line-height: 20px; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0 20px 0;">
                                {{ link }}
                            </p>
                            
                            <p style="color: #999999; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                                If you did not request this email, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0; text-align: center;">
                                © 2025 Atlas. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    link_url = f"{app.config.BASE_URL}/login/{email}/{token}"
    link_template = Template(body_html)
    body_html_send = link_template.render(link=link_url)

    sender_email = "noreply@scaledhumanity.org"
    recipient_emails = [email]

    send_ses_email(subject, body_text, body_html_send, sender_email, recipient_emails)


def send_sdk_login(email: str, token: str):
    """
    Send a login token to the user's email for SDK authentication.
    """
    subject = "Your Atlas SDK Login Token"

    body_text = f"""
Your Atlas SDK Login Token

Use the following token to authenticate your SDK session:

{token}

This token will expire in 1 hour.

If you didn't request this, please ignore this email.
"""

    body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your SDK Login Token</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h1 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Your Atlas SDK Login Token</h1>
                            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                                Use the following token with your SDK to authenticate:
                            </p>
                            <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; margin: 20px 0;">
                                <code style="font-family: 'Courier New', monospace; font-size: 14px; color: #495057; word-break: break-all;">
                                    {token}
                                </code>
                            </div>
                            <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                                <strong>How to use:</strong><br>
                                <code style="background-color: #f8f9fa; padding: 2px 4px; border-radius: 3px;">
                                    client.validate_magic_link("{token}")
                                </code>
                            </p>
                            <p style="color: #999999; font-size: 12px; margin-top: 30px;">
                                This token expires in 1 hour. If you didn't request this, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #dee2e6;">
                            <p style="color: #999999; font-size: 12px; margin: 0; text-align: center;">
                                © 2025 Atlas. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    sender_email = "noreply@scaledhumanity.org"
    recipient_emails = [email]

    send_ses_email(subject, body_text, body_html, sender_email, recipient_emails)
