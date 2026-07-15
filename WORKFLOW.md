# AI Development Workflow

## Round 1

Prompt:
A simple one-line prompt was used to generate a Profile Settings form.

Result:
The AI generated a working form, but required manual review and improvements.

---

## Round 2

A structured prompt was used with clear requirements:

- Keep validation separate
- Keep CSS modular
- Improve accessibility
- Review code quality
- Explain improvements

Result:
The generated code was more organized, easier to review, and included accessibility improvements and better project structure.

---

## Comparison

Round 1 produced functional code but lacked detailed guidance.

Round 2 produced cleaner code with:

- Better component organization
- Better accessibility
- Better validation workflow
- More maintainable structure

Although the structured prompt took longer to write, it reduced review time and required fewer manual corrections.

---

## AI Mistake

The AI suggested logging the submitted form data to the console, which would expose the user's password.

I identified this issue and would replace it with a generic success message instead.