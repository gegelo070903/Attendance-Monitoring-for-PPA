param(
    [string[]]$Ports = @("3000", "3001"),
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$normalizedPorts = @()
foreach ($entry in $Ports) {
    foreach ($part in ($entry -split "[,; ]+")) {
        if (-not [string]::IsNullOrWhiteSpace($part)) {
            $normalizedPorts += [int]$part
        }
    }
}

$Ports = $normalizedPorts | Select-Object -Unique

if (-not $Ports -or $Ports.Count -eq 0) {
    Write-Error "No valid ports were provided."
    exit 1
}

$connections = @()
foreach ($port in $Ports) {
    $found = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($found) {
        $connections += $found
    }
}

if (-not $connections -or $connections.Count -eq 0) {
    Write-Output ("No listeners found on ports: {0}" -f ($Ports -join ", "))
    exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($procId in $pids) {
    try {
        $process = Get-Process -Id $procId -ErrorAction Stop
    }
    catch {
        Write-Warning "PID $procId no longer exists."
        continue
    }

    if ($process.ProcessName -ne "node") {
        Write-Warning ("Skipping PID {0} ({1}) because it is not node.exe" -f $procId, $process.ProcessName)
        continue
    }

    if ($WhatIf) {
        Write-Output ("[WhatIf] Would stop PID {0} ({1})" -f $procId, $process.ProcessName)
        continue
    }

    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Output ("Stopped PID {0} ({1})" -f $procId, $process.ProcessName)

    try {
        Wait-Process -Id $procId -Timeout 5 -ErrorAction Stop
    }
    catch {
        # Process may already be fully exited or no longer tracked.
    }
}

$remaining = @()
Start-Sleep -Milliseconds 750
foreach ($port in $Ports) {
    $left = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($left) {
        $remaining += $left
    }
}

if ($remaining -and $remaining.Count -gt 0) {
    if ($WhatIf) {
        Write-Output "WhatIf mode: target ports are expected to remain in use."
        $remaining |
            Select-Object LocalAddress, LocalPort, OwningProcess |
            Sort-Object LocalPort |
            Format-Table -AutoSize |
            Out-String |
            Write-Output
        exit 0
    }

    Write-Warning "Some target ports are still in use."
    $remaining |
        Select-Object LocalAddress, LocalPort, OwningProcess |
        Sort-Object LocalPort |
        Format-Table -AutoSize |
        Out-String |
        Write-Output
    exit 1
}

Write-Output ("Ports are free: {0}" -f ($Ports -join ", "))
exit 0
