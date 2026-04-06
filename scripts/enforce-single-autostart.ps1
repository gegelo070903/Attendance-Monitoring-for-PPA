param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectDir,
    [string]$PrimaryTaskName = "PPA_Attendance_Server"
)

$ErrorActionPreference = "SilentlyContinue"

function Normalize-PathSafe {
    param([string]$PathValue)
    try {
        return [System.IO.Path]::GetFullPath($PathValue).TrimEnd('\\')
    }
    catch {
        return $PathValue
    }
}

$projectRoot = Normalize-PathSafe -PathValue $ProjectDir
$autoStartPath = Normalize-PathSafe -PathValue (Join-Path $projectRoot "AUTO-START.bat")
$autoStartLeaf = "AUTO-START.bat"

$removedStartupItems = 0
$removedRunEntries = 0
$removedTasks = 0

Write-Output "Enforcing single auto-start source..."

# Remove duplicate scheduled tasks that launch this project's AUTO-START.bat.
$allTasks = Get-ScheduledTask
foreach ($task in $allTasks) {
    if ($task.TaskName -eq $PrimaryTaskName) {
        continue
    }

    $matchesTask = $false
    foreach ($action in $task.Actions) {
        $execute = ($action.Execute | Out-String).Trim().ToLowerInvariant()
        $args = ($action.Arguments | Out-String).Trim().ToLowerInvariant()
        $combined = "$execute $args"

        if ($combined.Contains($autoStartLeaf.ToLowerInvariant()) -or $combined.Contains($projectRoot.ToLowerInvariant())) {
            $matchesTask = $true
            break
        }
    }

    if ($matchesTask) {
        Unregister-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -Confirm:$false
        if ($LASTEXITCODE -eq 0 -or $?) {
            $removedTasks++
            Write-Output ("Removed duplicate scheduled task: {0}{1}" -f $task.TaskPath, $task.TaskName)
        }
    }
}

# Remove Startup-folder entries that reference this project or AUTO-START.bat.
$startupDirs = @(
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
)

try {
    $wshShell = New-Object -ComObject WScript.Shell
}
catch {
    $wshShell = $null
}

foreach ($dir in $startupDirs) {
    if (-not (Test-Path $dir)) {
        continue
    }

    $items = Get-ChildItem -Path $dir -File
    foreach ($item in $items) {
        $removeItem = $false

        if ($item.Extension -ieq ".lnk" -and $wshShell) {
            $shortcut = $wshShell.CreateShortcut($item.FullName)
            $target = Normalize-PathSafe -PathValue ($shortcut.TargetPath)
            $arguments = ($shortcut.Arguments | Out-String).Trim().ToLowerInvariant()
            if ($target.ToLowerInvariant().Contains($autoStartLeaf.ToLowerInvariant()) -or
                $target.ToLowerInvariant().Contains($projectRoot.ToLowerInvariant()) -or
                $arguments.Contains($autoStartLeaf.ToLowerInvariant()) -or
                $arguments.Contains($projectRoot.ToLowerInvariant())) {
                $removeItem = $true
            }
        }

        if ($item.Extension -in @(".bat", ".cmd", ".ps1")) {
            $normalized = Normalize-PathSafe -PathValue $item.FullName
            if ($normalized.ToLowerInvariant().Contains($autoStartLeaf.ToLowerInvariant()) -or
                $normalized.ToLowerInvariant().Contains($projectRoot.ToLowerInvariant())) {
                $removeItem = $true
            }
        }

        if ($removeItem) {
            Remove-Item -LiteralPath $item.FullName -Force
            if ($?) {
                $removedStartupItems++
                Write-Output ("Removed Startup entry: {0}" -f $item.FullName)
            }
        }
    }
}

# Remove Run key entries that reference this project or AUTO-START.bat.
$runKeyPaths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
)

foreach ($keyPath in $runKeyPaths) {
    if (-not (Test-Path $keyPath)) {
        continue
    }

    $properties = Get-ItemProperty -Path $keyPath
    foreach ($property in $properties.PSObject.Properties) {
        if ($property.Name -in @("PSPath", "PSParentPath", "PSChildName", "PSDrive", "PSProvider")) {
            continue
        }

        $valueText = [string]$property.Value
        if ([string]::IsNullOrWhiteSpace($valueText)) {
            continue
        }

        $valueLower = $valueText.ToLowerInvariant()
        if ($valueLower.Contains($autoStartLeaf.ToLowerInvariant()) -or $valueLower.Contains($projectRoot.ToLowerInvariant())) {
            Remove-ItemProperty -Path $keyPath -Name $property.Name -Force
            if ($?) {
                $removedRunEntries++
                Write-Output ("Removed Run key entry: {0} ({1})" -f $property.Name, $keyPath)
            }
        }
    }
}

Write-Output ("Cleanup summary: removed {0} duplicate scheduled task(s), {1} Startup item(s), and {2} Run key entrie(s)." -f $removedTasks, $removedStartupItems, $removedRunEntries)
exit 0
