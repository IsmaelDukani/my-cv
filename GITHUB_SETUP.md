# How to Push Your Code to GitHub

It seems that the repositories `cv-maker` and `Build-cv` do not exist on your GitHub account yet, or you don't have permission to access them.

Follow these steps to create a new repository and push your code:

1.  **Log in to GitHub**: Go to [https://github.com](https://github.com) and log in.

2.  **Create a New Repository**:
    *   Click the **+** icon in the top-right corner and select **New repository**.
    *   **Repository name**: Enter `cv-maker` (or `Build-cv` if you prefer).
    *   **Visibility**: Choose **Public** or **Private**.
    *   **Initialize this repository with**: Leave all options (README, .gitignore, License) **UNCHECKED**. (This is important because you already have code locally).
    *   Click **Create repository**.

3.  **Push Your Code**:
    *   Once created, copy the HTTPS URL (e.g., `https://github.com/IsmaelDukani/cv-maker.git`).
    *   Run the following commands in your terminal (replace the URL with yours if different):

    ```bash
    git remote set-url origin https://github.com/IsmaelDukani/cv-maker.git
    git push -u origin main
    ```

    *   If it asks for authentication, follow the browser prompt.

## Troubleshooting
*   **"Repository not found"**: Double-check the URL and ensure you created the repository on GitHub *first*.
*   **Authentication**: If the browser prompt fails, you might need to generate a Personal Access Token (Settings -> Developer settings -> Personal access tokens) and use that as your password.
