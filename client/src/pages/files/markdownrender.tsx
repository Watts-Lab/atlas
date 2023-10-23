"use client";

import React from "react";
import ReactDOM from "react-dom";
import Markdown from "react-markdown";
import RemarkMathPlugin from "remark-math";
import RemarkGFMPlugin from "remark-gfm";
import RehypeKatexPlugin from "rehype-katex";
import RehypeMathJaxPlugin from "rehype-mathjax";

import ReactDOMServer from "react-dom/server";

import "katex/dist/katex.min.css";

import { MathpixMarkdown, MathpixLoader } from "mathpix-markdown-it";

interface MarkdownRenderProps {
  markdown: string;
}

const MarkdownRender = ({ markdown }: MarkdownRenderProps) => {

  return (
    <div className="flex justify-center items-center pt-3">
      <div className="prose lg:prose-xl">
        {/* <Markdown
          remarkPlugins={[RemarkGFMPlugin, RemarkMathPlugin]}
          rehypePlugins={[RehypeKatexPlugin, RehypeMathJaxPlugin]}
        >a
          {markdown}
        </Markdown> */}

        <MathpixLoader>
          <MathpixMarkdown text={markdown} />
        </MathpixLoader>
      </div>
    </div>
  );
};

export default MarkdownRender;
