# Lunsjkollektivet menu slack action

Posts the next working day's menu from Lunsjkollektivet to a Slack channel

![Message example](https://user-images.githubusercontent.com/25268506/157867346-5eaa135e-a746-46ec-896b-c64fd34cdbcf.png)

## Example GitHub Action workflow

```yml
name: Post Lunsjkollektivet menu to Slack

on:
    schedule:
        - cron: '0 9 * * MON' # Monday at 9:00am UTC
        - cron: '0 9 * * TUE' # Tuesday at 9:00am UTC
        - cron: '0 9 * * WED' # Wednesday at 9:00am UTC
        - cron: '0 9 * * THU' # Thursday at 9:00am UTC
        - cron: '0 9 * * FRI' # Friday at 9:00am UTC

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
