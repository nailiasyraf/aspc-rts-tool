$ErrorActionPreference = 'Stop'
$browserJob = $null

try {
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Set-Location -LiteralPath $projectRoot
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $null = Get-Command node.exe -ErrorAction Stop

    # Reuse only a Next.js server belonging to this checkout, not another tool.
    $serverPath = Join-Path $projectRoot 'node_modules\next\dist\server\lib\start-server.js'
    $runningServers = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -ge 0 })
    if ($runningServers.Count -gt 0) {
        $ports = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $_.OwningProcess -in $runningServers.ProcessId } |
            Select-Object -ExpandProperty LocalPort -Unique)
        foreach ($existingPort in $ports) {
            $existingUrl = "http://127.0.0.1:$existingPort"
            try {
                $response = Invoke-WebRequest -Uri $existingUrl -UseBasicParsing -TimeoutSec 10
                if ($response.StatusCode -eq 200 -and $response.Content.Contains('ASPC RTS Tool')) {
                    Write-Host "Opening the running tool: $existingUrl"
                    Start-Process $existingUrl
                    exit 0
                }
            } catch {}
        }
        throw 'This checkout already has a server starting or reporting an error. Check its terminal window, then try again.'
    }

    if (-not (Test-Path -LiteralPath 'node_modules\next\dist\bin\next')) {
        Write-Host 'Installing project dependencies for the first launch...'
        & $npm ci --prefer-offline --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Dependency setup failed. Check your internet connection and try again.' }
    }

    $port = $null
    foreach ($candidate in 3010..3099) {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidate)
        try {
            $listener.Start()
            $port = $candidate
            break
        } catch {
            # Another app uses this port; try the next one.
        } finally {
            $listener.Stop()
        }
    }
    if ($null -eq $port) { throw 'No available local port was found between 3010 and 3099.' }
    $url = "http://127.0.0.1:$port"
    Write-Host "Starting ASPC RTS Tool at $url"
    Write-Host 'Your browser will open automatically when the page is ready.'
    Write-Host 'Keep this window open while using the tool. Press Ctrl+C to stop the server.'
    Write-Host "If the browser does not open, visit $url manually."

    $browserJob = Start-Job -ArgumentList $url -ScriptBlock {
        param($pageUrl)
        $deadline = (Get-Date).AddMinutes(3)
        do {
            try {
                $response = Invoke-WebRequest -Uri $pageUrl -UseBasicParsing -TimeoutSec 10
                if ($response.StatusCode -eq 200 -and $response.Content.Contains('ASPC RTS Tool')) {
                    Start-Process $pageUrl
                    return
                }
            } catch {}
            Start-Sleep -Seconds 1
        } while ((Get-Date) -lt $deadline)
        Write-Error "The page did not become ready. Check the server output and open $pageUrl manually."
    }

    & $npm run dev -- --hostname 127.0.0.1 --port $port
    if ($LASTEXITCODE -ne 0) { throw 'The server stopped with an error. See the output above.' }
} catch {
    Write-Host "Launch failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($null -ne $browserJob) {
        Stop-Job -Job $browserJob -ErrorAction SilentlyContinue
        Receive-Job -Job $browserJob -ErrorAction SilentlyContinue
        Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
    }
}
