import React, { useState } from "react"
import { Star, MessageSquare, User, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: any
}

interface Question {
  id: string
  productId: string
  userId: string
  userName: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: any
  createdAt: any
}

interface Props {
  reviews: Review[]
  questions: Question[]
  currentUser: any
  sellerId: string
  onSubmitReview: (rating: number, comment: string) => Promise<void> | void
  onSubmitQuestion: (question: string) => Promise<void> | void
  hasUserReviewed: boolean
  loading?: boolean
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
}

const ProductServiceReviewsAndQuestions: React.FC<Props> = ({
  reviews,
  questions,
  currentUser,
  sellerId,
  onSubmitReview,
  onSubmitQuestion,
  hasUserReviewed,
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
  submittingAnswer
}) => {
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [questionText, setQuestionText] = useState("")

  // Handler local para reseñas
  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reviewRating === 0 || reviewComment.trim().length < 10) return
    await onSubmitReview(reviewRating, reviewComment)
    setReviewRating(0)
    setReviewComment("")
  }

  // Handler local para preguntas
  const handleQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (questionText.trim().length < 10) return
    await onSubmitQuestion(questionText)
    setQuestionText("")
  }

  return (
    <>
      {/* Reseñas */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Reseñas de Usuarios ({reviews.length})</h2>
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
          <form onSubmit={handleReview} className="mb-8 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium mb-3">Escribe tu reseña</h3>
            <div className="mb-4">
              <Label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                Calificación
              </Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
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
                placeholder="Comparte tu experiencia..."
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
          <p className="text-gray-600">Sé el primero en dejar una reseña.</p>
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
      </section>

      {/* Preguntas y Respuestas */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Preguntas y Respuestas ({questions.length})</h2>
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
        {currentUser && currentUser.firebaseUser.uid !== sellerId && (
          <form onSubmit={handleQuestion} className="mb-8 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium mb-3">Hacer una pregunta</h3>
            <div className="mb-4">
              <Label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                Tu pregunta
              </Label>
              <Textarea
                id="question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="¿Qué te gustaría saber?"
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
          <p className="text-gray-600">Sé el primero en hacer una pregunta.</p>
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
                ) : currentUser && currentUser.firebaseUser.uid === sellerId && setAnsweringQuestionId && setAnswerText && handleSubmitAnswer ? (
                  <div className="ml-4">
                    {answeringQuestionId === question.id ? (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={2}
                          className="mb-2"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSubmitAnswer(question.id)}
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
                              setAnsweringQuestionId(null)
                              setAnswerText("")
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setAnsweringQuestionId(question.id)}>
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
      </section>
    </>
  )
}

export default ProductServiceReviewsAndQuestions 