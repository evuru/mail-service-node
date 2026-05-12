i have an email sender app i wrote, it takes template and a payload schema(object; can be nested too). we are going to do a couple of things,

1. i need a config that will prevent my mail from being tagged as spam, since these are legit emails from organizations using their smtp and other configs

2. a list of 10 email types we can send, transaction alert,  welcome, verification, reset password, etc, with the payload schema for each, payload schema expalanation is below

{

  "name": "User Notification",

  "description": "Fields for user-facing notification emails",

  "fields": [

    {

      "key": "user_name",

      "type": "string",

      "required": true,

      "example": "Jane Doe",

      "description": "Recipient's display name"

    },

    {

      "key": "action_url",

      "type": "string",

      "required": true,

      "example": "https://app.com/dashboard",

      "description": "Call-to-action link"

    },

    {

      "key": "expiry",

      "type": "string",

      "required": false,

      "example": "24 hours",

      "description": "How long the link or code is valid"

    }

  ]

}

Field type options: string | number | boolean | array | object

Only name is required — description and fields are optional (fields defaults to []).



when we are done we can then create the email templates for each of these emails using the suggested table format , these email templates will be nice and concise I'll give you a sample template, you'lll soimplefy then make out our 10 from,

but let's start with the config, email types and payload schemas first