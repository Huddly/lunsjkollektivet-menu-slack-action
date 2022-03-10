# Lunsjkollektivet menu slack action

Posts todays menu from Lunsjkollektivet to a Slack channel

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
                  slack_token: ${{ secrets.SLACK_TOKEN }}
                  slack_channel: food
                  slack_author: Lunsjkollektivet bot
```

## Configuration

| Name            | Descripion               | Required |
| --------------- | ------------------------ | -------- |
| `slack_token`   | Slack token for the bot  | true     |
| `slack_channel` | Slack channel to post to | true     |
| `slack_author`  | Slack author name        | true     |
