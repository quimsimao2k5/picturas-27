# Use the official RabbitMQ image as the base image
FROM rabbitmq:4.0.5-management

# Set environment variables
# ENV RABBITMQ_DEFAULT_USER=admin
# ENV RABBITMQ_DEFAULT_PASS=admin123

# Expose RabbitMQ ports
EXPOSE 5672 15672

# Copy RabbitMQ definitions file
COPY definitions.json /etc/rabbitmq/definitions.json
COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf

# Default command
CMD ["rabbitmq-server"]

