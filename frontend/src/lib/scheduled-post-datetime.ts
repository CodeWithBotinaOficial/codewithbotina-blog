export function utcToLocalInputValue(utcString: string): string {
  if (!utcString) return "";

  const date = new Date(utcString);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number): string => String(value).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function localDatetimeToUtcIso(localDatetimeValue: string): string {
  if (!localDatetimeValue) return "";

  const [datePart, timePart] = localDatetimeValue.split("T");
  if (!datePart || !timePart) return "";

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) {
    return "";
  }

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return Number.isNaN(localDate.getTime()) ? "" : localDate.toISOString();
}

export function utcIsoToLocalDatetime(utcIsoString: string): string {
  return utcToLocalInputValue(utcIsoString);
}
