import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageSquare, Tag, Layers, Heart, Share2, Star, User, AlertCircle, Loader2 } from "lucide-react"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// Props extendidos para lógica de favoritos, compartir, reseñas y preguntas
interface ServiceDetailProps {
  service: {
    id: string
    name: string
    description: string
    price: number
    imageUrl?: string
    media?: { url: string; type: string; path: string }[]
    sellerId: string
    sellerName?: string
    category?: string
    categoryName?: string
    brand?: string
    isFavorite?: boolean
    averageRating?: number
    reviewsCount?: number
    // ...otros campos necesarios
  }
  breadcrumbs?: { name: string; href?: string }[]
  isFavorite: boolean
  onToggleFavorite: () => void
  onShare: () => void
  onContactSeller?: () => void
  reviews: any[]
  onSubmitReview: (rating: number, comment: string) => void
  questions: any[]
  onSubmitQuestion: (question: string) => void
  currentUser?: any
  loading?: boolean
  // Estados adicionales para manejo de reseñas y preguntas
  reviewError?: string | null
  reviewSuccess?: string | null
  submittingReview?: boolean
  questionError?: string | null
  questionSuccess?: string | null
  submittingQuestion?: boolean
  answeringQuestionId?: string | null
  answerText?: string
  setAnsweringQuestionId?: (id: string | null) => void
  setAnswerText?: (text: string) => void
  handleSubmitAnswer?: (questionId: string) => void
  submittingAnswer?: boolean
  hasUserReviewed?: boolean
}

const ServiceDetail: React.FC<ServiceDetailProps> = ({
  service,
  breadcrumbs = [],
  isFavorite,
  onToggleFavorite,
  onShare,
  onContactSeller,
  reviews = [],
  onSubmitReview,
  questions = [],
  onSubmitQuestion,
  currentUser,
  loading = false,
  reviewError,
  reviewSuccess,
  submittingReview,
  questionError,
  questionSuccess,
  submittingQuestion,
  answeringQuestionId,
  answerText,
  setAnsweringQuestionId,
  setAnswerText,
  handleSubmitAnswer,
  submittingAnswer,
  hasUserReviewed = false,
}) => {
  const mainImage = service.media && service.media.length > 0 ? service.media[0].url : (service.imageUrl || "/placeholder.svg")
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [shareCopied, setShareCopied] = useState(false)

  // Compartir
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
    }
    onShare()
  }

  // Enviar reseña
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (reviewRating > 0 && reviewComment.trim()) {
      onSubmitReview(reviewRating, reviewComment)
      setReviewRating(0)
      setReviewComment("")
    }
  }

  // Enviar pregunta
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (questionText.trim()) {
      onSubmitQuestion(questionText)
      setQuestionText("")
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 flex flex-col gap-4">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild href="/">
              <Link href="/">Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {service.categoryName && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild href={`/category/${service.category}`}>
                  <Link href={`/category/${service.category}`}>{service.categoryName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{service.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Imagen principal con overlay de botones */}
      <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        <Image
          src={mainImage}
          alt={service.name}
          fill
          className="object-cover"
        />
        {/* Overlay botones */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            variant={isFavorite ? "default" : "secondary"}
            size="icon"
            className={isFavorite ? "bg-red-100 hover:bg-red-200 text-red-600" : "bg-white/80 hover:bg-white"}
            onClick={onToggleFavorite}
            aria-label="Favorito"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button variant="secondary" size="icon" className="bg-white/80 hover:bg-white" onClick={handleShare} aria-label="Compartir">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
        {shareCopied && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow">¡Enlace copiado!</span>
        )}
      </div>

      {/* Info principal */}
      <h1 className="text-2xl font-bold truncate mt-2">{service.name}</h1>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {service.categoryName && (
          <span className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"><Layers className="h-4 w-4" />{service.categoryName}</span>
        )}
        {service.brand && (
          <span className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"><Tag className="h-4 w-4" />Marca: {service.brand}</span>
        )}
      </div>
      <p className="text-gray-700 text-base whitespace-pre-line border-l-2 border-blue-200 pl-3">{service.description}</p>
      <div className="text-lg font-semibold text-blue-700">
        {service.price ? `$${service.price.toFixed(2)}` : "Precio a convenir"}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <Button onClick={onContactSeller} className="w-full flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Contactar al vendedor
        </Button>
      </div>

      {/* User Reviews */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Reseñas de Usuarios ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {reviewError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{reviewError}</AlertDescription>
            </Alert>
          )}
          {reviewSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{reviewSuccess}</AlertDescription>
            </Alert>
          )}

          {currentUser && !hasUserReviewed && (
            <form onSubmit={handleSubmitReview} className="mb-8 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-3">Escribe tu reseña</h3>
              <div className="mb-4">
                <Label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                  Calificación
                </Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                      onClick={() => setReviewRating(star)}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comentario
                </Label>
                <Textarea
                  id="comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Comparte tu experiencia con el servicio..."
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingReview}>
                {submittingReview ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar Reseña"
                )}
              </Button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-gray-600">Sé el primero en dejar una reseña para este servicio.</p>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="text-sm font-medium ml-2">{review.userName}</span>
                    <span className="text-xs text-gray-500">
                      {review.createdAt?.toDate
                        ? review.createdAt.toDate().toLocaleDateString()
                        : "Fecha desconocida"}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions and Answers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Preguntas y Respuestas ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {questionError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{questionError}</AlertDescription>
            </Alert>
          )}
          {questionSuccess && (
            <Alert className="mb-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{questionSuccess}</AlertDescription>
            </Alert>
          )}

          {currentUser && currentUser.firebaseUser.uid !== service.sellerId && (
            <form onSubmit={handleSubmitQuestion} className="mb-8 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-3">Hacer una pregunta</h3>
              <div className="mb-4">
                <Label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                  Tu pregunta
                </Label>
                <Textarea
                  id="question"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="¿Qué te gustaría saber sobre este servicio?"
                  rows={3}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingQuestion}>
                {submittingQuestion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar Pregunta"
                )}
              </Button>
            </form>
          )}

          {questions.length === 0 ? (
            <p className="text-gray-600">Sé el primero en hacer una pregunta sobre este servicio.</p>
          ) : (
            <div className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-blue-600">Pregunta:</span>
                      <span className="text-sm text-gray-500">{question.userName}</span>
                      <span className="text-xs text-gray-400">
                        {question.createdAt?.toDate
                          ? question.createdAt.toDate().toLocaleDateString()
                          : "Fecha desconocida"}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{question.question}</p>
                  </div>

                  {question.answer ? (
                    <div className="ml-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-green-600">Respuesta:</span>
                        <span className="text-sm text-gray-500">{question.answeredBy}</span>
                        <span className="text-xs text-gray-400">
                          {question.answeredAt?.toDate
                            ? question.answeredAt.toDate().toLocaleDateString()
                            : "Fecha desconocida"}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{question.answer}</p>
                    </div>
                  ) : currentUser && currentUser.firebaseUser.uid === service.sellerId ? (
                    <div className="ml-4">
                      {answeringQuestionId === question.id ? (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Textarea
                            value={answerText}
                            onChange={(e) => setAnswerText && setAnswerText(e.target.value)}
                            placeholder="Escribe tu respuesta..."
                            rows={2}
                            className="mb-2"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitAnswer && handleSubmitAnswer(question.id)}
                              disabled={submittingAnswer}
                            >
                              {submittingAnswer ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando...
                                </>
                              ) : (
                                "Responder"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAnsweringQuestionId && setAnsweringQuestionId(null)
                                setAnswerText && setAnswerText("")
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setAnsweringQuestionId && setAnsweringQuestionId(question.id)}>
                          Responder
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="ml-4 text-sm text-gray-500 italic">Esperando respuesta del vendedor...</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ServiceDetail 