"use client";

import React, { useEffect, useState } from "react";
import ReactDom from "react-dom";

import MarkdownRender from "./markdownrender";

import Header from "../dashboard/header";

import "katex/dist/katex.min.css";


const Files = () => {
  const [markdownContent, setMarkdownContent] = useState("");

  const MarkdownWithMath = {
    content: `Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following equation.
  
  $$
  L = \\frac{1}{2} \\rho v^2 S C_L
  $$`,
  };
  useEffect(() => {
    // Fetch Markdown content from your Flask API
    fetch("http://localhost:8080/api/markdown")
      .then((response) => response.json())
      .then((data) => setMarkdownContent(data.content))
      .catch((error) => console.error(error));
  }, []);


  return (
    <div data-theme="cupcake">
      <Header fileName="test.md" />
      <MarkdownRender markdown={markdownContent} />
    </div>
  );
};

export default Files;
