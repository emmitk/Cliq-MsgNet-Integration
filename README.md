# Cliq-MsgNet-Integration

## Contacts
Emmit (S&A) - MVP Developer
Ben Lange - MessageMedia contact

## Purpose
When deployed to an Azure Function, this code will call the Cliq web service(s) to return data to perform the following functions:
* Return key log data to send an SMS to employees whose key is due to expire
* Return Key and Cylinder data to export as a CSV for use in SIEM (Security Incident & Event Management)


## Azure Resource(s)
Azure Function (Primary) - Executed at a pre-set time each day (7am)
Azure File Storage - Store CSV files for import into SIEM

## Other Resources
MessageNet/MessageMedia cloud service


