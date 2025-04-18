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

    # current app instance
    app = Sanic.get_app("Atlas")

    subject = "Your link to Atlas!"
    body_text = "Please click the link below to sign in to your account."

    # Load the HTML template
    body_html = """
<!doctypehtml>
<html lang=en>
<meta charset=UTF-8>
<meta content="width=device-width,initial-scale=1" name=viewport>
<title>Your Login Link</title>
<style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0
    }

    .container {
        max-width: 600px;
        margin: 50px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, .1)
    }

    .header {
        text-align: center;
        padding-bottom: 20px
    }

    .header img {
        max-width: 100px
    }

    .content {
        text-align: center
    }

    .content h1 {
        font-size: 24px;
        margin-bottom: 20px
    }

    .content p {
        font-size: 16px;
        margin-bottom: 20px;
        text-align: left
    }

    .button-container {
        text-align: left
    }

    .button {
        display: inline-block;
        background-color: #000;
        color: #fff;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 20px;
        font-size: 16px
    }

    .link {
        display: block;
        margin-top: 20px;
        word-break: break-all;
        color: #666;
        text-align: left
    }

    .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 12px;
        color: #aaa
    }
</style>
<div class=container>
    <div class=header><svg enable-background="new 0 0 50 50" version=1.1 viewBox="0 0 50 50" width=50 x=0px xml:space=preserve xmlns=http://www.w3.org/2000/svg xmlns:xlink=http://www.w3.org/1999/xlink y=0px><path d="M34.721,4.628H15.279c-1.232,0-2.232,1-2.232,2.232v3.163c0,1.233,1,2.233,2.232,2.233h19.441c1.232,0,2.232-1,2.232-2.233  V6.86C36.953,5.628,35.953,4.628,34.721,4.628z"/><path d="M34.721,21.186H15.279c-1.234,0-2.232,1-2.232,2.232v3.164c0,1.232,0.999,2.231,2.232,2.231h19.441  c1.232,0,2.232-0.999,2.232-2.231v-3.164C36.953,22.186,35.953,21.186,34.721,21.186z"/><path d="M34.721,37.743H15.279c-1.234,0-2.232,0.999-2.232,2.233v3.163c0,1.231,0.999,2.232,2.232,2.232h19.441  c1.232,0,2.232-1.001,2.232-2.232v-3.163C36.953,38.742,35.953,37.743,34.721,37.743z"/><path d="M46.768,7.441h-5.954c-0.553,0-1,0.448-1,1s0.447,1,1,1h5.954c0.68,0,1.232,0.553,1.232,1.233v12.093  C48,23.447,47.447,24,46.768,24H43.66l0.771-0.832c0.376-0.405,0.352-1.038-0.054-1.414c-0.405-0.376-1.039-0.352-1.413,0.054  l-2.326,2.512c-0.034,0.037-0.048,0.083-0.075,0.122c-0.002,0.004-0.005,0.008-0.008,0.012c-0.033,0.049-0.076,0.093-0.099,0.147  c-0.005,0.011-0.007,0.023-0.012,0.035c-0.021,0.056-0.025,0.114-0.037,0.172s-0.031,0.114-0.032,0.173  c0,0.007-0.004,0.012-0.004,0.019s0.004,0.012,0.004,0.018c0.001,0.059,0.021,0.114,0.032,0.172s0.015,0.116,0.037,0.172  c0.005,0.012,0.007,0.024,0.012,0.037c0.021,0.048,0.061,0.087,0.089,0.131c0.008,0.013,0.016,0.024,0.024,0.037  c0.025,0.036,0.037,0.079,0.068,0.112l0.025,0.028c0.001,0,0.001,0,0.001,0.001l2.3,2.483c0.197,0.213,0.465,0.32,0.733,0.32  c0.243,0,0.487-0.088,0.68-0.267c0.405-0.375,0.43-1.008,0.054-1.413L43.661,26h3.106C48.55,26,50,24.55,50,22.768V10.674  C50,8.892,48.55,7.441,46.768,7.441z"/><path d="M9.187,24H3.232C1.45,24,0,25.45,0,27.232v12.094c0,1.782,1.45,3.232,3.232,3.232h3.106l-0.77,0.831  c-0.375,0.405-0.351,1.038,0.054,1.413c0.193,0.179,0.437,0.267,0.68,0.267c0.269,0,0.537-0.107,0.734-0.32l2.326-2.512  c0.032-0.035,0.045-0.079,0.071-0.116c0.009-0.014,0.018-0.027,0.027-0.041c0.026-0.041,0.063-0.077,0.083-0.122  c0.005-0.012,0.007-0.024,0.012-0.037c0.022-0.057,0.026-0.115,0.037-0.174c0.011-0.057,0.031-0.111,0.032-0.17  c0-0.007,0.004-0.012,0.004-0.019s-0.004-0.013-0.004-0.02c-0.001-0.058-0.021-0.112-0.032-0.17  c-0.011-0.059-0.015-0.117-0.037-0.174c-0.005-0.012-0.007-0.024-0.012-0.036c-0.021-0.05-0.062-0.091-0.092-0.137  c-0.004-0.006-0.007-0.012-0.011-0.017c-0.028-0.042-0.042-0.089-0.077-0.127l-2.326-2.512c-0.376-0.406-1.009-0.431-1.414-0.054  c-0.405,0.375-0.429,1.008-0.054,1.413l0.771,0.832H3.232C2.553,40.559,2,40.006,2,39.326V27.232C2,26.553,2.553,26,3.232,26h5.954  c0.552,0,1-0.448,1-1S9.739,24,9.187,24z"/><path d="M10.15,8.252c-0.011-0.059-0.015-0.117-0.037-0.173c-0.005-0.012-0.007-0.025-0.012-0.037  c-0.021-0.047-0.06-0.086-0.088-0.13c-0.007-0.01-0.013-0.02-0.021-0.03C9.966,7.843,9.953,7.798,9.92,7.763L7.594,5.251  c-0.376-0.405-1.009-0.43-1.414-0.054C5.776,5.572,5.751,6.205,6.126,6.61l0.77,0.831H1c-0.552,0-1,0.448-1,1s0.448,1,1,1h5.897  l-0.771,0.832c-0.375,0.405-0.351,1.038,0.054,1.414c0.193,0.178,0.437,0.266,0.68,0.266c0.269,0,0.537-0.108,0.734-0.32L9.92,9.121  c0.036-0.039,0.05-0.086,0.079-0.129C10,8.99,10.001,8.988,10.003,8.986c0.033-0.049,0.075-0.093,0.099-0.146  c0.005-0.012,0.007-0.024,0.012-0.035c0.022-0.057,0.026-0.115,0.037-0.174c0.011-0.058,0.031-0.112,0.032-0.171  c0-0.006,0.004-0.012,0.004-0.019s-0.004-0.012-0.004-0.019C10.182,8.364,10.162,8.31,10.15,8.252z"/></svg></div>
    <div
        class=content>
        <h1>Your Login Link</h1>
        <p>Welcome to Atlas!
            <p>Please click the magic link below to sign in to your account.</p><a class=button href={{token}}>Sign In</a>
            <p>If you're on a mobile device, you can also copy the link below and paste it into the browser of your choice.
                <div class=link>{{token}}</div>
                <p>If you did not request this email, you can safely ignore it.</div>
<hr>
<div class=footer>© 2025 Atlas. All rights reserved.</div>
</div>
"""

    link_template = Template(body_html)
    body_html_send = link_template.render(
        token=f"{app.config.BASE_URL}/login/{email}/{token}"
    )
    sender_email = "noreply@scaledhumanity.org"
    recipient_emails = [email]

    send_ses_email(subject, body_text, body_html_send, sender_email, recipient_emails)
