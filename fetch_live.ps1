$candles = Invoke-RestMethod -Uri 'https://reset.much.fun/v1/market/candles?pair=RESET%2FUSDC&interval=15m&limit=500'
$trades = Invoke-RestMethod -Uri 'https://reset.much.fun/v1/market/trades?pair=RESET%2FUSDC&limit=200'

$result = [PSCustomObject]@{
    candles = $candles.candles
    trades = $trades.rows
}

$json = $result | ConvertTo-Json -Depth 5
Set-Content -Path 'C:\Users\hitech\.gemini\antigravity\scratch\reset-dex-web\real_feed.json' -Value $json
Write-Host "Success! Candles: $($candles.candles.Count), Trades: $($trades.rows.Count)"
