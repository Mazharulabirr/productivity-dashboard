Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & WScript.ScriptFullName & chr(34) & " /WAIT", 0
Set oFSO = CreateObject("Scripting.FileSystemObject")
strFolder = oFSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c cd /d """ & strFolder & "\react-app"" && npm run dev", 1, False
