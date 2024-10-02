import { Fragment, memo } from "react"

export const MessageFormatter = memo(({ message }: { message: string }) => (
  <div>
    {message.split("\n").map((line, index) => (
      <Fragment key={index}>
        {line}
        <br />
      </Fragment>
    ))}
  </div>
));
