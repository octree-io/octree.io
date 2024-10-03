import { Fragment, memo } from "react"

const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

export const MessageFormatter = memo(({ message }: { message: string }) => {
  const parts = message.split(urlRegex);

  return (
    <div>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          const url = part.startsWith("http") ? part : `http://${part}`;
          return (
            <Fragment key={index}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {part}
              </a>
            </Fragment>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </div>
  );
});
