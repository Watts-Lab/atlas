import React, { use, useEffect, useState } from "react";

function Index() {
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:8080/api/home")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setMessage(data.message);
      });
  }, []);

  return <div>{message}</div>;
}

export default Index;
