FROM python:3.12-slim
WORKDIR /app
COPY . .
ENV PORT=8080
ENV DOCTOR_ROUTER_PORT=8728
ENV DOCTOR_ROUTER_TLS=false
EXPOSE 8080
CMD ["python", "doctor/cloud_server.py"]
