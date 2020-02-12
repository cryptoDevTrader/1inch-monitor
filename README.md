# 1inch Monitor
Monitors [1inch.exchange](https://1inch.exchange) price pairs via the [API](https://1inch.exchange/#/api) and sends notifications via Telegram if price pair targets are met.

## Configuration

### Environment Variabls
- **LOG_LEVEL** (default: `info`) Sets the log level. Available log levels are `silly|debug|verbose|http|info|warn|error`.
- **INTERVAL_SECONDS** (default: `1`) Sets the number of seconds to wait between requests. Note that API requests are made synchronously to avoid any rate limits enforced by [1inch.exchange](https://1inch.exchange). With the default value of `1`, 60 rules will take 60 seconds (plus round-trip request time) to be run.
- **API_VERSION** (default: `v1.1`) Sets the API version to use. The latest version should be documented at [API](https://1inch.exchange/#/api).
- **TELEGRAM_BOT_TOKEN** (required) Sets the [Telegram Bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot) token to use for sending notifications.
- **TELEGRAM_CHAT_ID** (required) Sets the [Telegram chat id](https://stackoverflow.com/a/32572159/882223) to use for sending notifications.
- **RULES** (requied) Defines rules to be used for alerting. More information below. New line separated.

### Rules
Rules are defined as follows.

```
<amountToSwap> <fromTokenSymbol> <comparitor> <amountToCompare> <toTokenSymbol> [!<disabledExchangesList>]
```

## Running

### Docker
```shell
docker run \
--name 1inch-monitor \
-e TELEGRAM_BOT_TOKEN=CHANGEME \
-e TELEGRAM_CHAT_ID=CHANGEME \
-e RULES='1 USDC >= 1.01 DAI !0X Relays \
1 DAI >= 1.01 USDC !OX Relays,Uniswap,Kyber \
 ETH >= 250 USDC !AirSwap,Kyber,Uniswap \
250 DAI <= 1 ETH' \
divthis/1inch-monitor
```

### Docker-compose

Use the following for your `docker-compose.yml`.

```yaml
version: '3'

services:
  1inch-monitor:
    image: divthis/1inch-monitor
    environment:
      TELEGRAM_BOT_TOKEN: CHANGEME
      TELEGRAM_CHAT_ID:  CHANGEME
      RULES: |-
        1 USDC >= 1.01 DAI !0X Relays
        1 DAI >= 1.01 USDC !OX Relays,Uniswap,Kyber
        1 ETH >= 250 USDC !AirSwap,Kyber,Uniswap
        250 DAI <= 1 ETH
```

Run the following from the same directory as `docker-compose.yml`.

```shell
docker-compose up
```