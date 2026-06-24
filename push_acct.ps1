$token = "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"
$owner = "Es8564"
$repo = "Falkon_Dashbored"
$branch = "main"
$headers = @{ "Authorization" = "token $token"; "Accept" = "application/vnd.github.v3+json"; "User-Agent" = "PowerShell" }
$localPath = "d:\AI CHAT_website so far best\account.html"
$repoPath = "account.html"
Write-Host "Pushing $repoPath..."
$content = [System.IO.File]::ReadAllBytes($localPath)
$base64 = [System.Convert]::ToBase64String($content)
$sha = $null
try { $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/contents/$repoPath`?ref=$branch" -Headers $headers -Method Get -ErrorAction Stop; $sha = $existing.sha } catch {}
$body = @{ message = "Add dual trial system (21-day demo + 7-day live)"; content = $base64; branch = $branch }
if ($sha) { $body["sha"] = $sha }
$jsonBody = $body | ConvertTo-Json -Depth 5
try { $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/contents/$repoPath" -Headers $headers -Method Put -Body $jsonBody -ContentType "application/json"; Write-Host "  OK" } catch { Write-Host "  FAILED: $($_.Exception.Message)" }
