const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' });

/**
 * « Modifié le 2 octobre » (V6, « Mes créations »): the day and month of the
 * last save, in the device's time zone, with the year only when it is not
 * `today`'s. `today` is passed in, so rendering never reads the clock itself.
 * `undefined` for an unreadable date.
 */
export const modifiedOn = (updatedAt: string, today: Date): string | undefined => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  const day = date.getDate() === 1 ? '1er' : String(date.getDate());
  const year = date.getFullYear() === today.getFullYear() ? '' : ` ${String(date.getFullYear())}`;
  return `Modifié le ${day} ${monthName.format(date)}${year}`;
};
