package grpc

import (
	"context"
	"net"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"

	"github.com/Sourav01112/user-service/internal/config"
	"github.com/Sourav01112/user-service/internal/service"
	pb "github.com/Sourav01112/user-service/proto"
)

type Server struct {
	pb.UnimplementedUserServiceServer

	grpcServer  *grpc.Server
	userService service.UserService
	config      *config.Config
	log         *zap.Logger
}

func NewServer(userService service.UserService, config *config.Config, log *zap.Logger) *Server {
	opts := []grpc.ServerOption{
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle:     15 * time.Second,
			MaxConnectionAge:      30 * time.Second,
			MaxConnectionAgeGrace: 5 * time.Second,
			Time:                  5 * time.Second,
			Timeout:               1 * time.Second,
		}),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             5 * time.Second,
			PermitWithoutStream: true,
		}),
		grpc.UnaryInterceptor(loggingInterceptor(log)),
	}

	grpcServer := grpc.NewServer(opts...)

	server := &Server{
		grpcServer:  grpcServer,
		userService: userService,
		config:      config,
		log:         log,
	}

	pb.RegisterUserServiceServer(grpcServer, server)

	if config.Env == "development" {
		reflection.Register(grpcServer)
	}

	return server
}

func (s *Server) Start(ctx context.Context) error {
	listener, err := net.Listen("tcp", ":"+s.config.GRPCPort)
	if err != nil {
		return err
	}

	s.log.Info("gRPC server starting", zap.String("port", s.config.GRPCPort))

	go func() {
		<-ctx.Done()
		s.log.Info("Shutting down gRPC server...")
		s.grpcServer.GracefulStop()
	}()

	if err := s.grpcServer.Serve(listener); err != nil {
		return err
	}

	return nil
}

func (s *Server) Stop() {
	s.grpcServer.GracefulStop()
}

func loggingInterceptor(log *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		resp, err := handler(ctx, req)

		duration := time.Since(start)

		if err != nil {
			log.Error("gRPC request failed",
				zap.String("method", info.FullMethod),
				zap.Duration("duration", duration),
				zap.Error(err))
		} else {
			log.Info("gRPC request completed",
				zap.String("method", info.FullMethod),
				zap.Duration("duration", duration))
		}

		return resp, err
	}
}
