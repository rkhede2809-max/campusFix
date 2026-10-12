import { useState } from 'react';

const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'Furniture',
  'Internet',
  'Other'
];

const emptyForm = {
  title: '',
  description: '',
  category: 'Electrical',
  location: ''
};

function ComplaintForm({ onSubmit, submitting, departments }) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      setFormError('Please fill in title, description, and location.');
      return;
    }

    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        departmentId: form.departmentId || undefined,
        location: form.location.trim()
      });
      setForm(emptyForm);
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <section className="panel" id="complaint-form">
      <h3>Submit a complaint</h3>
      {formError ? <div className="banner banner-error">{formError}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Complaint title</label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Broken fan in Room 204"
          />
        </div>
        <div className="form-group">
          <label htmlFor="departmentId">Service department</label>
          <select id="departmentId" name="departmentId" value={form.departmentId || ''} onChange={handleChange}>
            <option value="">Choose a department (optional)</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id}>{department.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Explain the problem clearly so staff can fix it."
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="location">Campus location / room number</label>
          <input
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Block A, Room 204"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit complaint'}
        </button>
      </form>
    </section>
  );
}

export default ComplaintForm;
