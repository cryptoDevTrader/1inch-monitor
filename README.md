# 1inch Monitor
Monitors [1inch.exchange](https://1inch.exchange) price pairs via the [API](https://1inch.exchange/#/api) and sends notifications via Telegram if price pair targets are met.

## Configuration

### Environment Variabls
- **LOG_LEVEL** (default: `info`) Sets the log level. Available log levels are `silly|debug|verbose|http|info|warn|error`.
- **INTERVAL_SECONDS** (default: `10`) Sets the number of seconds to wait between checks for all rules. All rules will are checked in parallel and the next check occurs after the interval.
- **API_VERSION** (default: `v1.1`) Sets the API version to use. The latest version should be documented at [API](https://1inch.exchange/#/api).
- **TELEGRAM_BOT_TOKEN** (required) Sets the [Telegram Bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot) token to use for sending notifications.
- **TELEGRAM_CHAT_ID** (required) Sets the [Telegram chat id](https://stackoverflow.com/a/32572159/882223) to use for sending notifications.
- **RULES** (required) Defines rules to be used for alerting. More information below. New line separated.

### Rules
*Note: Rule parsing has changed. Please use the new format below.*
Rules are defined as follows.

```
<amountToSwap> <fromTokenSymbol>-<toTokenSymbol>[-<toTokenSymbol>] <comparitor> <amountToCompare> [!<disabledExchangesList>]
```

Symbols are chained together via a hyphen.

## Running

### Docker
```shell
docker run \
--name 1inch-monitor \
-e TELEGRAM_BOT_TOKEN=CHANGEME \
-e TELEGRAM_CHAT_ID=CHANGEME \
-e RULES='1 USDC-DAI >= 1.01 !0X Relays \
1 DAI-USDC >= 1.01 !OX Relays,Uniswap,Kyber \
1 ETH-USDC >= 250 !AirSwap,Kyber,Uniswap \
250 DAI-ETH <= 1' \
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
        1 USDC-DAI >= 1.01 !0X Relays
        1 DAI-USDC >= 1.01 !OX Relays,Uniswap,Kyber
        1 ETH-USDC >= 250 !AirSwap,Kyber,Uniswap
        250 DAI-ETH <= 1
```

Run the following from the same directory as `docker-compose.yml`.

```shell
docker-compose up
```
