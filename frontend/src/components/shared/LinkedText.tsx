interface LinkedTextProps {
  text: string;
  className?: string;
}

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;
const URL_TEST = /^https?:\/\//;

export function LinkedText({ text, className }: LinkedTextProps) {
  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_TEST.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
