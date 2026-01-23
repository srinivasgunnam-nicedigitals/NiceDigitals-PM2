
$root = "c:\Users\gmsri\Downloads\pma2home\version-2-pma"
$exclude = @("node_modules", ".git", ".gemini", "dist", "build", "coverage", ".DS_Store", "Thumbs.db")

function Get-Tree($path, $indent) {
    $items = Get-ChildItem -Path $path -Force | Sort-Object Name
    $output = @()
    
    foreach ($item in $items) {
        if ($exclude -contains $item.Name) { continue }
        
        if ($item.PSIsContainer) {
            $output += "$indent/$($item.Name)"
            $output += Get-Tree $item.FullName "$indent  "
        } else {
            $content = Get-Content $item.FullName -Raw
            $lineCount = 0
            $charCount = 0
            if ($content) {
                $lineCount = ($content -split "`n").Count
                $charCount = $content.Length
            }
            $output += "$indent- $($item.Name) [Lines: $lineCount, Chars: $charCount]"
        }
    }
    return $output
}

Write-Host "Generating Inventory..."
$tree = Get-Tree $root ""

$allFiles = Get-ChildItem -Path $root -Recurse -File -Force | Where-Object { 
    $relPath = $_.FullName.Substring($root.Length)
    $skip = $false
    foreach ($ex in $exclude) { if ($relPath -match "\\$ex\\") { $skip = $true } }
    !$skip
}

$totalFiles = $allFiles.Count
$totalLines = 0
$totalChars = 0

foreach ($f in $allFiles) {
    try {
        $content = Get-Content $f.FullName -Raw
        if ($content) {
            $totalLines += ($content -split "`n").Count
            $totalChars += $content.Length
        }
    } catch {}
}

Write-Host "`n-----------------------------------"
Write-Host "FULL FILE INVENTORY"
Write-Host "-----------------------------------"
$tree | ForEach-Object { Write-Host $_ }
Write-Host "`n-----------------------------------"
Write-Host "SUMMARY"
Write-Host "-----------------------------------"
Write-Host "Total Files: $totalFiles"
Write-Host "Total Lines: $totalLines"
Write-Host "Total Chars: $totalChars"
