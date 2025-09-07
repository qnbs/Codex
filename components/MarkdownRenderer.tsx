import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-invert prose-sm md:prose-base max-w-none"
      components={{
        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline" />,
        h1: ({node, ...props}) => <h1 {...props} className="text-white" />,
        h2: ({node, ...props}) => <h2 {...props} className="text-white" />,
        h3: ({node, ...props}) => <h3 {...props} className="text-white" />,
        strong: ({node, ...props}) => <strong {...props} className="text-gray-200" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
