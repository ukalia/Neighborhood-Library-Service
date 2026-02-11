import Card from './components/Card';

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary-600 mb-4">
          Neighborhood Library Service
        </h1>
        <p className="text-lg text-gray-600">
          Community library management system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card hover>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Browse Books
          </h2>
          <p className="text-gray-600">
            Explore our collection of books available for borrowing.
          </p>
        </Card>

        <Card hover>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Member Dashboard
          </h2>
          <p className="text-gray-600">
            View your borrowed books and transaction history.
          </p>
        </Card>

        <Card hover>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Librarian Tools
          </h2>
          <p className="text-gray-600">
            Manage books, members, and lending transactions.
          </p>
        </Card>

        <Card hover>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            About
          </h2>
          <p className="text-gray-600">
            Learn more about our community library service.
          </p>
        </Card>
      </div>
    </div>
  );
}
