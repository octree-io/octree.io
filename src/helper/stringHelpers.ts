export const formatTimestamp = (timestamp: string | undefined): string => {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};
