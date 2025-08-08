ildnpm
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Setup

### Cloud Storage CORS for Development

To allow file uploads/downloads from the Firebase Studio preview environment, apply the development CORS policy to your bucket. **Replace `<PROJECT_ID>` with your actual Firebase Project ID.**

```bash
# aplicar la política CORS al bucket de desarrollo
gsutil cors set cors-dev.json gs://<PROJECT_ID>.appspot.com

# comprobar
gsutil cors get gs://<PROJECT_ID>.appspot.com
```
