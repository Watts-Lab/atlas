import React, { useState } from "react";

interface DataRow {
  id: number;
  name: string;
  job: string;
  company: string;
  location: string;
  lastLogin: string;
  favoriteColor: string;
}

const Table: React.FC = () => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DataRow;
    direction: "ascending" | "descending";
  } | null>(null);

  const data: DataRow[] = [
    {
      id: 1,
      name: "Cy Ganderton",
      job: "Quality Control Specialist",
      company: "Littel, Schaden and Vandervort",
      location: "Canada",
      lastLogin: "12/16/2020",
      favoriteColor: "Blue",
    },
    {
      id: 2,
      name: "Hart Hagerty",
      job: "Desktop Support Technician",
      company: "Zemlak, Daniel and Leannon",
      location: "United States",
      lastLogin: "12/5/2020",
      favoriteColor: "Purple",
    },
  ];

  const requestSort = (key: keyof DataRow) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (sortConfig !== null) {
      const sortedArray = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
      return sortedArray;
    }
    return data;
  }, [data, sortConfig]);

  return (
    <div className="overflow-x-auto">
      <table className="table table-xs">
        <thead>
          <tr>
            <th></th>
            <th onClick={() => requestSort("name")}>Name</th>
            <th onClick={() => requestSort("job")}>Job</th>
            <th onClick={() => requestSort("company")}>Company</th>
            <th onClick={() => requestSort("location")}>Location</th>
            <th onClick={() => requestSort("lastLogin")}>Last Login</th>
            <th onClick={() => requestSort("favoriteColor")}>Favorite Color</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.id}>
              <th>{row.id}</th>
              <td>{row.name}</td>
              <td>{row.job}</td>
              <td>{row.company}</td>
              <td>{row.location}</td>
              <td>{row.lastLogin}</td>
              <td>{row.favoriteColor}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Job</th>
            <th>Company</th>
            <th>Location</th>
            <th>Last Login</th>
            <th>Favorite Color</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default Table;
