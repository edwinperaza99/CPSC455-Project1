import smtplib
import os
from dotenv import load_dotenv

"""
To use this script, please setup a gmail account, and get an access token for the corresponding email to 
login with this script. Also, make sure to include the python-dotenv dependency before running the script.
The requirement.txt has been provided. Lastly, create a .env file to store sensitive information
(i.e mailbox_address, mailbox_access_token, recipient_email_address)

"""


load_dotenv()

msg="""\
Subject: Thank You For Being Awesome!

Thank you for being a loyal customer of Legit Bank! To celebrate you, enjoy a chocolate bar courtesy of Legit bank
https://shorturl.at/yMaCm
"""

mailserver = smtplib.SMTP('smtp.gmail.com',587)
# identify ourselves to smtp gmail client
mailserver.ehlo()
# secure our email with tls encryption
mailserver.starttls()
# re-identify ourselves as an encrypted connection
mailserver.ehlo()

mailserver.login(os.getenv('mailbox_address'), os.getenv('mailbox_access_token'))

mailserver.sendmail(os.getenv('mailbox_address'), os.getenv('recepient_email_address'), msg)

mailserver.quit()