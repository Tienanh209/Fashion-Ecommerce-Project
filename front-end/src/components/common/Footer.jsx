export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-10 grid md:grid-cols-5 gap-6 text-sm">
        <div className="md:col-span-2">
          <div className="text-2xl font-extrabold">TA.LAB</div>
          <p className="text-gray-600 mt-3">
            We have clothes that suits your style and which you’re proud to wear.
          </p>
        </div>
        <Col title="Company" items={["About", "Features", "Works", "Career"]}/>
        <Col title="Help" items={["Customer Support", "Delivery Details", "Terms & Conditions", "Privacy Policy"]}/>
        <Col title="FAQ" items={["Account", "Orders", "Payments"]}/>
      </div>
      <div className="border-t py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} TA.LAB — All rights reserved.
      </div>
    </footer>
  );
}

function Col({ title, items }) {
  return (
    <div>
      <div className="font-semibold mb-3">{title}</div>
      <ul className="space-y-2 text-gray-600">
        {items.map((it) => <li key={it}><a href="#" className="hover:text-black">{it}</a></li>)}
      </ul>
    </div>
  );
}
