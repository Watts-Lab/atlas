export { default as MultipleOutputNode } from "./MultipleOutput/MultipleOutputNode";
export { default as SingleOutputNode } from "./SingleOutput/SingleOutputNode";
export { default as PaperInputNode } from "./PaperInput/PaperInputNode";
export { default as MTurkOutputNode } from "./MTurkOutput/MTurkOutputNode";

export const loadNodeTypes = async () => {
  // Using import.meta.glob to dynamically fetch node modules
  const nodeModules = import.meta.glob("./*/*Node.tsx", {
    eager: false,
  });

  const nodes = await Promise.all(
    Object.keys(nodeModules).map(async (path) => {
      const moduleName = path.split("/").pop().replace(".tsx", "");
      const module = await nodeModules[path]();
      // Use the exported displayName or fallback to moduleName
      const displayName = module.displayName || moduleName;
      const displayGroup = module.displayGroup || "Uncategorized";
      return {
        id: moduleName,
        displayName,
        displayGroup,
      };
    })
  );

  return nodes;
};
