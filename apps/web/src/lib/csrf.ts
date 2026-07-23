export function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

export function getCsrfToken(): string | undefined {
  const token = readCookie("alt_csrf_token");
  return token ? decodeURIComponent(token) : undefined;
}
