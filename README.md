# SolveSphere – DSA Teaching Assistant Chat

(http://solvesphere1615.s3-website-us-east-1.amazonaws.com/)

SolveSphere is an interactive chat application designed to help students work through LeetCode problems. It uses a GPT-based teaching assistant to guide users with hints, questions, and strategies—without providing complete solutions. The application leverages a hybrid solution combining LangChain for real-time conversation context and prompt chaining with DynamoDB for long‑term conversation history storage. The entire system is containerized using Docker and deployed on AWS ECS/ECR for scalable and modular operations, while the frontend is hosted as a static website on S3 (with CloudFront in front for improved performance and security).

## Table of Contents

- Features
- Architecture
- Technologies
- Setup Instructions
- Usage Guide
- GPT Integration and Conversation Management
- Deployment on AWS


## Features

- **Interactive Chat Interface:**
  A clean and modern UI where users can input a LeetCode problem URL, specify their doubt, and choose their skill level (beginner, intermediate, or advanced).

- **Session Management:**
  Each conversation is stored as a separate session under a fixed user ID. Users can start new chats without losing previous sessions, which appear in a vertical sidebar. A logout functionality is also provided to clear local session data.

- **GPT-Powered Guidance:**
  The backend uses OpenAI’s GPT (via a LangChain wrapper) to generate hints and guiding questions that encourage critical thinking without revealing complete solutions.

- **Hybrid Memory System:**
  Conversation context is managed in real time using LangChain’s ConversationBufferMemory and persisted long-term in a DynamoDB NoSQL database for scalability.

- **Scalable Containerized Deployment:**
  The backend is containerized with Docker and deployed on AWS ECS/ECR, while the static frontend is hosted on S3 and delivered via CloudFront.


## Architecture

### Overview

The system is built with a modular, scalable architecture consisting of a backend API and a static frontend:

  - **Backend API:**

    - **FastAPI** is used to create REST endpoints for chat interactions, session management, and conversation history retrieval.
    - **OpenAI GPT Integration:** The application uses OpenAI's GPT model (wrapped with LangChain) to generate dynamic responses. The model is configured with a detailed system prompt to guide responses based on the user's skill level.
    - **LangChain & Memory:** The conversation context is managed using LangChain’s ConversationChain with ConversationBufferMemory, ensuring that each chat session’s context is preserved during the conversation.
    - **Persistent Storage:** Conversation history is stored in Amazon DynamoDB with a composite key (Partition key: user_id; Sort key: session_info formatted as "{session_id}#{timestamp}") to enable efficient querying and long‑term storage.

  - **Frontend:**

    - A static website built using HTML, CSS, and JavaScript.
    - The interface features a sidebar listing previous chat sessions, a main chat area, and an input section.
    - The frontend interacts with the backend via REST API calls and supports session management (new chat, resume previous chats, and logout).

### AWS Deployment

- **Containerization:** The backend application is containerized using Docker.
- **AWS ECS/ECR:** The Docker image is pushed to Amazon ECR and deployed on Amazon ECS (Fargate) for serverless container orchestration and scaling.
- **Static Frontend on S3:** The frontend (HTML, CSS, JS) is hosted on an Amazon S3 bucket with static website hosting enabled.


## Technologies

- **Backend:**
    - Python, FastAPI
    - OpenAI API (GPT-4o-mini)
    - LangChain (for managing conversation context and prompt chaining)
    - Boto3 (for interfacing with DynamoDB)
    - Docker, AWS ECS/ECR

- **Frontend:**
    - HTML, CSS, JavaScript
    - AWS S3 and CloudFront for static hosting

- **Database:**
    - Amazon DynamoDB (for persisting chat history)


## Setup Instructions

### Prerequisites

  - Python 3.11
  - Docker
  - AWS CLI configured with appropriate permissions and IAM roles
  - An AWS account with access to ECS, ECR, S3, DynamoDB and CloudWatch
  - OpenAI API key

## Backend Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Eldrago12/SolveSphere.git
   cd SolveSphere/server
   ```

2. **Create and Activate a Virtual Environment (Optional):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Application Locally:**
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 5000 --reload
   ```

## Docker & AWS ECS/ECR Deployment

1. **Build the Docker Image:**
   ```bash
   docker build -t SolveSphere-backend .
   ```

2. **Tag and Push to ECR:**
   ```bash
   docker tag solvesphere-backend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/solvesphere-backend:latest
   docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/solvesphere-backend:latest
   ```

3. **Deploy on ECS:**
   - Create an ECS cluster (if not already created).
   - Create a task definition that uses the pushed image and defines environment variables (e.g., OPENAI_API_KEY).
   - Create an ECS service based on the task definition.
   - Ensure your service has the appropriate IAM roles for accessing DynamoDB and other resources.

## Frontend Setup

1. **Clone the Repository (if not already cloned):**
   ```bash
   git clone https://github.com/your-username/solvesphere.git
   cd SolveSphere/frontend
   ```

2. **Upload Static Files to S3:**
   - Create an S3 bucket.
   - Enable static website hosting and set index.html as the index document.
   - Upload your index.html, style.css, script.js, and asset files.


## Usage Guide

### Using the Application

1. **Starting a Chat:**
   - Open the website (http://solvesphere1615.s3-website-us-east-1.amazonaws.com/).
   - Enter your User ID, LeetCode URL, Skill Level, and your doubt.
   - When you submit the form, the application locks your User ID and starts a new session.
   - Your conversation is stored and appears in the sidebar.

2. **Resuming Previous Chats:**
   - Your previous chat sessions (each identified by a session ID) appear vertically in the sidebar.
   - Click on any session to load its conversation history and continue the conversation.

3. **Starting a New Chat:**
   - Click the "New Chat" button to reset the chat area and create a new session while keeping your User ID locked.
   - This new session will have a different LeetCode problem and doubt but remain under the same User ID.

4. **Logging Out:**
   - Click the "Logout" button (located at the bottom of the sidebar) to clear your current session data and unlock the User ID field.
   - Upon logout, all locally stored session data is cleared. If you log in again using the same User ID, your previous chats (stored in DynamoDB) will be fetched and shown.


### API Endpoints

- POST http://44.192.97.35:5000/api/query:
  Handles sending a new message or continuing a conversation.
  Payload: { user_id, session_id (optional), leetcode_url (optional), question, skill_level }
  Response: { answer, session_id }

- GET http://44.192.97.35:5000/api/session:
  Retrieves all session IDs for a given user.
  Query Parameters: user_id
  Response: An array of session IDs.

- GET http://44.192.97.35:5000/api/history:
  Retrieves the conversation history for a specific session.
  Query Parameters: user_id, session_id
  Response: An array of message objects.


## GPT Integration and Conversation Management

### GPT Integration

  - **OpenAI GPT Model:**
    The backend uses OpenAI’s GPT (GPT-40-mini) via the OpenAI API. The GPT model is wrapped using LangChain’s ChatOpenAI interface to provide a structured conversation.

  - **System Prompt:**
    A detailed system prompt is provided to the model to ensure it acts as a teaching assistant. The prompt includes guidelines to tailor responses based on the user's skill level (beginner, intermediate, advanced) and to ensure that only minimal code snippets are provided, not full solutions.

  - **LangChain Conversation Chain:**
    The conversation context is managed using LangChain’s ConversationChain combined with ConversationBufferMemory. This allows the system to maintain context across a session and generate more relevant, context-aware responses.

### Conversation History Persistence

  - **DynamoDB Storage:** Every message is stored in DynamoDB under a composite sort key (session_info formatted as "{session_id}#{timestamp}"), with user_id as the partition key. This design enables efficient retrieval of conversation history for each session.
  - **Session Management:** Each conversation (or session) is identified by a unique session ID. The backend provides endpoints to list sessions and retrieve full conversation histories, enabling users to resume previous chats even after breaks.


## Deployment on AWS

  - **Backend:**
    The backend is containerized with Docker and deployed on AWS ECS (using Fargate) for a serverless, scalable solution. The Docker image is stored in AWS ECR.

  - **Frontend:**
    The static frontend is hosted on Amazon S3 with static website hosting enabled, and CloudFront is used as a CDN in front of S3 for low-latency content delivery and HTTPS support.

  - **Scalability:**
    This architecture is highly scalable and modular. DynamoDB provides a fully managed NoSQL database for conversation storage, and AWS ECS/ECR allows for scalable container orchestration, ensuring that the system can handle increased traffic.
