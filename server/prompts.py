import sqlite3


class Prompt:
    def __init__(self, name, description, prompt_template, key=None, version=1):
        self.key = key if key else name.lower().replace(" ", "_")
        self.name = name
        self.description = description
        self.prompt_template = prompt_template
        self.version = version

        # Connect to the database
        self.conn = sqlite3.connect("prompts.db")
        self.cursor = self.conn.cursor()

        # Create the prompts table if it doesn't exist
        self.cursor.execute(
            """CREATE TABLE IF NOT EXISTS prompts
                             (id INTEGER PRIMARY KEY, key TEXT, name TEXT, description TEXT, prompt_template TEXT, version INTEGER)"""
        )

        # Check if the prompt already exists in the database
        self.cursor.execute(
            "SELECT * FROM prompts WHERE key=? ORDER BY version DESC", (self.key,)
        )
        prompt = self.cursor.fetchone()

        if prompt:
            # Check if the version of the prompt in the database is the same as the current version
            if prompt[5] != self.version:
                print(
                    f"Warning: Prompt '{self.name}' has a different version ({prompt[5]}) in the database than the current version ({self.version})"
                )
                # Insert the new version of the prompt into the database
                self.cursor.execute(
                    "INSERT INTO prompts (key, name, description, prompt_template, version) VALUES (?, ?, ?, ?, ?)",
                    (
                        self.key,
                        self.name,
                        self.description,
                        self.prompt_template,
                        self.version,
                    ),
                )
                self.conn.commit()
        else:
            # Insert the prompt into the database
            self.cursor.execute(
                "INSERT INTO prompts (key, name, description, prompt_template, version) VALUES (?, ?, ?, ?, ?)",
                (
                    self.key,
                    self.name,
                    self.description,
                    self.prompt_template,
                    self.version,
                ),
            )
            self.conn.commit()

    def __repr__(self):
        return (
            f"Prompt(key={self.key}, name={self.name}, description={self.description})"
        )


behavior_description = """Use the following pieces of context to answer the question at the end according to \
the format of the answer provided. If you don't know the answer, just say that \
you don't know, don't try to make up an answer. Keep the answer as concise as possible.\n\
Here is the context: \n\n {input} \n\n\
Question: Describe the behavioral outcome in a few words. Look at the background tab for \
tips on which behavior can correspond to which number; feel free to improve the wording here.\
If the authors have a clear, short description of each behavior in the paper itself, copy their \
words here instead of paraphrasing. If their description is not clear enough on its own, or \
is very verbose, please paraphrase here. \
Answer in the following format and do not explain your answer: {answer_format} \

\n Answer:
"""


behavior_description_2 = """
Name the behavioral outcome in a few words. If the authors have a clear, short description of each \
behavior in the paper itself, copy their words here instead of paraphrasing. If their description \
is not clear enough on its own, or is very verbose, please paraphrase here. \
Give a JSON list of each behavioral outcome.
"""


prompts = [
    Prompt(
        "behavior description",
        "A list of behaviors named or found in the paper, with a short description of each.",
        behavior_description,
    ),
]

print(prompts[0])


# import OpenAI Model, Prompt Template and LLm Chain
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA


# Initialize the language model
llm = ChatOpenAI(temperature=0.9)

# Initialize a prompt. This prompt takes in a variable called product asks the
# LLM to generate the best name to describe a company that makes that product.
prompt = ChatPromptTemplate.from_template(behavior_description)


qa_chain = RetrievalQA.from_chain_type(llm, retriever=vectordb.as_retriever())

# Build prompt
template = """Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Use three sentences maximum. Keep the answer as concise as possible. Always say "thanks for asking!" at the end of the answer. 
{context}
Question: {question}
Helpful Answer:"""
QA_CHAIN_PROMPT = PromptTemplate.from_template(template)  # Run chain
qa_chain = RetrievalQA.from_chain_type(
    llm,
    retriever=vectordb.as_retriever(),
    return_source_documents=True,
    chain_type_kwargs={"prompt": QA_CHAIN_PROMPT},
)

# Pass question to the qa_chain
question = "What are major topics for this class?"
result = qa_chain({"query": question})
result["result"]
