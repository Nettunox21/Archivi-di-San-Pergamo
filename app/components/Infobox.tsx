export default function Infobox({ title, image, data }: any) {
  return (
    <aside className="infobox">
      {image && (
        <img src={image} alt={title} className="infobox-image" />
      )}
      <h2>{title}</h2>
      <table>
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  );
}
