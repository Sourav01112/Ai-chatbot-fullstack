

import asyncio
import logging
from concurrent import futures
import grpc
from grpc_reflection.v1alpha import reflection

from app.core.config import settings
from app.proto.generated import ai_service_pb2 as ai__service__pb2, ai_service_pb2_grpc

from app.grpc.handler import AIServiceHandler

logger = logging.getLogger(__name__)

async def serve_grpc():
    print("called")
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    
    ai_service_pb2_grpc.add_AIServiceServicer_to_server(AIServiceHandler(), server)
    
    SERVICE_NAMES = (
        ai__service__pb2.DESCRIPTOR.services_by_name['AIService'].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)
    
    listen_addr = f"[::]:{settings.GRPC_PORT}"
    server.add_insecure_port(listen_addr)
    
    logger.info(f"Starting gRPC server on {listen_addr}")
    await server.start()
    
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down gRPC server...")
        await server.stop(5)