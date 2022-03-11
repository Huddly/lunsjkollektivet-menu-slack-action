# Lunsjkollektivet menu slack action

Posts todays menu from Lunsjkollektivet to a Slack channel

![Message example](https://user-images.githubusercontent.com/25268506/157835353-cfb71d8d-e98e-49ca-92bf-6947ba989836.png)

## Example GitHub Action workflow

```yml
name: Post Lunsjkollektivet menu to Slack

on:
    schedule:
        # Runs monday-friday at 9:30am UTC
        - cron: '0 30 9 * * 1-5'

jobs:
    replicate_changes:
        runs-on: ubuntu-latest

        steps:
            - name: Checkout repository
              uses: actions/checkout@v2
            - name: Post Lunsjkollektivet menu to Slack
              uses: huddly/lunsjkollektivet-menu-slack-action@master
              with:
                  slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
                  slack_channel: '#food'
                  slack_author: 'Lunsjkollektivet Chef'
```

## Configuration

| Name            | Descripion                                                                                   | Required |
| --------------- | -------------------------------------------------------------------------------------------- | -------- |
| `slack_webhook` | [Slack webhook URL](https://huddly.slack.com/apps/A0F7XDUAZ-incoming-webhooks?tab=more_info) | true     |
| `slack_channel` | Slack channel to post to.                                                                    | true     |
| `slack_author`  | Slack author name.                                                                           | true     |
