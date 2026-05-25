# Directory Firestore Schema

## Collection: directoryContacts

Each document represents one contact in the employment authority directory.

### Fields

| Field name | Type | Required | Description |
|---|---|---|---|
| name | string | yes | Full name of the contact |
| role | string | yes | Contact role / job title |
| organization | string | yes | Company, employer, or department name |
| email | string | yes | Contact email |
| phone | string | no | Contact phone number |
| city | string | no | City or area |
| field | string | no | Professional field, for example: HR, training, employer relations |
| notes | string | no | Extra internal notes |
| status | string | yes | active / inactive |
| createdAt | timestamp | yes | Creation date |
| updatedAt | timestamp | no | Last update date |

