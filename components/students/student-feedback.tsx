const notices: Record<string, string> = {
  created: "Student added successfully.",
  updated: "Student details saved.",
  assigned: "Class placement saved for this term.",
  deleted: "Student deleted.",
  "academic-year-created": "Academic year added.",
  "term-created": "Term added.",
  "grade-created": "Grade added.",
  "class-created": "Class added.",
  "invoice-created": "Invoice created successfully.",
  "template-created": "Fee template created and is ready to use on invoices.",
  "school-details-saved": "School identity details saved and applied across the school.",
  "user-created": "User account created.",
  "user-updated": "User account updated.",
  "user-deleted": "User account deleted.",
  "expense-recorded": "Expense recorded and included in the financial reports.",
  "product-created": "Product added to the school project shop.",
  "product-sale-recorded": "Sale recorded and inventory updated.",
  "product-restocked": "Inventory stock has been increased.",
};

const errors: Record<string, string> = {
  "required-fields": "Enter the student's first name, last name, and admission number.",
  "parent-name-required": "Enter both the parent or guardian's first and last name, or leave all parent fields blank.",
  "invalid-parent-email": "Enter a valid parent or guardian email address.",
  "invalid-date": "Enter a valid date of birth.",
  "invalid-enrollment": "Choose a valid class and term from the same academic year.",
  "duplicate-admission": "That admission number is already in use.",
  "student-not-found": "The student record could not be found.",
  "invalid-student": "The student selection is invalid.",
  "student-has-invoices": "This student has invoices and cannot be deleted until those records are removed.",
  "invalid-date-range": "Enter valid start and end dates, with the end date after the start date.",
  "duplicate-academic-year": "An academic year with that name already exists.",
  "duplicate-term": "A term with that name already exists for the selected academic year.",
  "duplicate-grade": "A grade with that name already exists.",
  "duplicate-class": "A class with that name already exists for the selected academic year.",
  "invalid-academic-year": "Select an existing academic year.",
  "invalid-grade": "Select an existing grade.",
  "invalid-invoice": "The invoice details are incomplete or invalid.",
  "invalid-invoice-dates": "Enter valid invoice and due dates, and make sure the due date is not before the invoice date.",
  "invalid-invoice-items": "Add at least one fee item with a name and a valid positive amount.",
  "invalid-invoice-notes": "Invoice notes must be 500 characters or fewer.",
  "invalid-invoice-context": "The selected student, class, term, or academic year do not match.",
  "duplicate-invoice-number": "That invoice number is already in use.",
  "invalid-template": "Enter a template name and choose at least one fee item.",
  "invalid-template-items": "The selected year, class, or fee items are invalid. Check that the class belongs to the selected year.",
  "invalid-template-amount": "Enter a valid positive amount for each selected fee item.",
  "invalid-payment": "Enter a valid payment amount and method.",
  "invalid-payment-date": "Enter a valid payment date.",
  "invalid-payment-invoice": "Select an active invoice for this payment.",
  "invoice-already-paid": "This invoice is already fully paid.",
  "payment-exceeds-balance": "The payment amount cannot exceed the remaining invoice balance.",
  "invalid-school-details": "Enter a school name and a valid email address.",
  "school-logo-too-large": "The school logo must be smaller than 2 MB.",
  "invalid-school-logo": "Upload a PNG, JPEG, or WebP logo image.",
  "invalid-user": "Enter valid user details and choose an available role. Passwords must be at least 8 characters.",
  "duplicate-user-email": "A user with that email address already exists.",
  "cannot-change-own-role": "You cannot change your own administrator role.",
  "cannot-delete-self": "You cannot delete your own account.",
  "last-admin": "The school must keep at least one administrator account.",
  "user-not-found": "That user account no longer exists.",
  "invalid-expense": "Enter a valid date, category, description, positive amount, and payment method for this expense.",
  "invalid-bulk-invoice": "Choose a valid academic year and matching term, then enter valid invoice and due dates.",
  "invalid-bulk-template": "Choose an active general fee template for the selected academic year.",
  "invalid-bulk-fees": "Choose a valid fee template or select at least one fee item with a positive amount.",
  "empty-bulk-roster": "No students are enrolled in the selected grade or school for that term.",
  "bulk-roster-too-large": "This invoice batch exceeds the 2,000 student limit. Split it into smaller grade batches.",
  "invalid-product": "Enter a product, project, valid price, and nonnegative stock quantity.",
  "duplicate-product-sku": "That product SKU is already in use.",
  "invalid-product-sale": "Choose a valid product, quantity, payment method, and sale date.",
  "insufficient-product-stock": "The selected quantity is greater than the available stock.",
  "product-not-found": "The selected product is no longer available.",
  "invalid-stock-adjustment": "Enter a positive whole number for the stock adjustment.",
};

export function StudentFeedback({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  const message = error ? errors[error] : notice ? notices[notice] : undefined;
  if (!message) return null;

  return (
    <p
      className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
