param(
    [string]$CertPath = ".\certs\cert.pem"
)

$ErrorActionPreference = "Stop"

$resolvedCertPath = Resolve-Path -LiteralPath $CertPath -ErrorAction Stop
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($resolvedCertPath)
$thumbprint = $cert.Thumbprint

$storePath = "Cert:\CurrentUser\Root"
$existing = Get-ChildItem -Path $storePath | Where-Object { $_.Thumbprint -eq $thumbprint }

if ($existing) {
    Write-Output "Certificate already trusted in CurrentUser Root store."
    exit 0
}

Import-Certificate -FilePath $resolvedCertPath -CertStoreLocation $storePath | Out-Null
Write-Output "Certificate imported to CurrentUser Root store."
exit 0
