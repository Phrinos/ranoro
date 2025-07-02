
export async function requestClipboardPermission() {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
    return permissionStatus.state === 'granted' || permissionStatus.state === 'prompt';
  } catch (error) {
    console.error("Clipboard permission query failed:", error);
    return false;
  }
}
