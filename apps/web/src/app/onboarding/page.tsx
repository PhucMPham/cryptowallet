"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	ChevronRight,
	ChevronLeft,
	User,
	Calendar,
	MapPin,
	Phone,
	Shield,
	Wallet,
	CreditCard,
	Check,
	ArrowRight
} from "lucide-react";

type OnboardingStep = {
	id: string;
	title: string;
	subtitle: string;
	fields: {
		name: string;
		label: string;
		type: string;
		placeholder: string;
		required?: boolean;
		icon?: React.ReactNode;
	}[];
};

const ONBOARDING_STEPS: OnboardingStep[] = [
	{
		id: "personal",
		title: "Let's get to know you",
		subtitle: "We need this information to comply with regulations",
		fields: [
			{
				name: "firstName",
				label: "Legal first name",
				type: "text",
				placeholder: "John",
				required: true,
				icon: <User className="h-5 w-5 text-gray-400" />
			},
			{
				name: "lastName",
				label: "Legal last name",
				type: "text",
				placeholder: "Doe",
				required: true,
				icon: <User className="h-5 w-5 text-gray-400" />
			},
			{
				name: "dateOfBirth",
				label: "Date of birth",
				type: "date",
				placeholder: "MM/DD/YYYY",
				required: true,
				icon: <Calendar className="h-5 w-5 text-gray-400" />
			}
		]
	},
	{
		id: "contact",
		title: "Contact information",
		subtitle: "We'll use this to keep your account secure",
		fields: [
			{
				name: "phone",
				label: "Phone number",
				type: "tel",
				placeholder: "+1 (555) 000-0000",
				required: true,
				icon: <Phone className="h-5 w-5 text-gray-400" />
			},
			{
				name: "country",
				label: "Country",
				type: "text",
				placeholder: "United States",
				required: true,
				icon: <MapPin className="h-5 w-5 text-gray-400" />
			},
			{
				name: "address",
				label: "Street address",
				type: "text",
				placeholder: "123 Main St",
				required: true,
				icon: <MapPin className="h-5 w-5 text-gray-400" />
			},
			{
				name: "city",
				label: "City",
				type: "text",
				placeholder: "San Francisco",
				required: true,
				icon: <MapPin className="h-5 w-5 text-gray-400" />
			}
		]
	},
	{
		id: "security",
		title: "Secure your account",
		subtitle: "Add an extra layer of protection",
		fields: [
			{
				name: "pin",
				label: "Create a 6-digit PIN",
				type: "password",
				placeholder: "• • • • • •",
				required: true,
				icon: <Shield className="h-5 w-5 text-gray-400" />
			},
			{
				name: "confirmPin",
				label: "Confirm your PIN",
				type: "password",
				placeholder: "• • • • • •",
				required: true,
				icon: <Shield className="h-5 w-5 text-gray-400" />
			}
		]
	},
	{
		id: "preferences",
		title: "Investment preferences",
		subtitle: "Help us personalize your experience",
		fields: [
			{
				name: "investmentGoal",
				label: "Primary investment goal",
				type: "select",
				placeholder: "Select your goal",
				required: true,
				icon: <Wallet className="h-5 w-5 text-gray-400" />
			},
			{
				name: "experience",
				label: "Crypto experience level",
				type: "select",
				placeholder: "Select your experience",
				required: true,
				icon: <CreditCard className="h-5 w-5 text-gray-400" />
			}
		]
	}
];

export default function OnboardingPage() {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] = useState<Record<string, any>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [isCompleted, setIsCompleted] = useState(false);

	const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
	const step = ONBOARDING_STEPS[currentStep];
	const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

	const handleInputChange = (name: string, value: string) => {
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleNext = async () => {
		if (isLastStep) {
			setIsLoading(true);
			// Simulate API call
			setTimeout(() => {
				setIsCompleted(true);
				setTimeout(() => {
					router.push("/dashboard");
				}, 2000);
			}, 1500);
		} else {
			setCurrentStep(prev => prev + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(prev => prev - 1);
		}
	};

	const isStepValid = () => {
		return step.fields.every(field =>
			!field.required || formData[field.name]
		);
	};

	if (isCompleted) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="text-center">
					<div className="mb-6">
						<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
							<Check className="h-10 w-10 text-green-600" />
						</div>
					</div>
					<h1 className="text-3xl font-bold mb-2">Welcome aboard!</h1>
					<p className="text-gray-600 mb-4">Your account has been successfully created</p>
					<p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<div className="border-b">
				<div className="container mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-blue-600 rounded-full" />
							<span className="text-xl font-semibold">CryptoWallet</span>
						</div>
						<button className="text-sm text-gray-600 hover:text-gray-900">
							Need help?
						</button>
					</div>
				</div>
			</div>

			{/* Progress bar */}
			<div className="border-b">
				<div className="container mx-auto px-6 py-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm text-gray-600">
							Step {currentStep + 1} of {ONBOARDING_STEPS.length}
						</span>
						<span className="text-sm font-medium">
							{Math.round(progress)}% complete
						</span>
					</div>
					<Progress value={progress} className="h-2" />
				</div>
			</div>

			{/* Main content */}
			<div className="container mx-auto px-6 py-12">
				<div className="max-w-lg mx-auto">
					{/* Back button */}
					{currentStep > 0 && (
						<button
							onClick={handleBack}
							className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
						>
							<ChevronLeft className="h-4 w-4" />
							Back
						</button>
					)}

					{/* Step content */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">{step.title}</h1>
						<p className="text-gray-600">{step.subtitle}</p>
					</div>

					<div className="space-y-6">
						{step.fields.map((field) => (
							<div key={field.name}>
								<label
									htmlFor={field.name}
									className="block text-sm font-medium mb-2"
								>
									{field.label}
								</label>
								{field.type === "select" ? (
									<select
										id={field.name}
										value={formData[field.name] || ""}
										onChange={(e) => handleInputChange(field.name, e.target.value)}
										className="w-full h-12 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										required={field.required}
									>
										<option value="">{field.placeholder}</option>
										{field.name === "investmentGoal" && (
											<>
												<option value="growth">Long-term growth</option>
												<option value="income">Generate income</option>
												<option value="trading">Active trading</option>
												<option value="learning">Learn about crypto</option>
											</>
										)}
										{field.name === "experience" && (
											<>
												<option value="beginner">Beginner</option>
												<option value="intermediate">Intermediate</option>
												<option value="advanced">Advanced</option>
												<option value="expert">Expert</option>
											</>
										)}
									</select>
								) : (
									<div className="relative">
										{field.icon && (
											<div className="absolute left-3 top-1/2 -translate-y-1/2">
												{field.icon}
											</div>
										)}
										<Input
											id={field.name}
											type={field.type}
											value={formData[field.name] || ""}
											onChange={(e) => handleInputChange(field.name, e.target.value)}
											className={`h-12 text-base ${field.icon ? "pl-10" : ""}`}
											placeholder={field.placeholder}
											required={field.required}
										/>
									</div>
								)}
							</div>
						))}
					</div>

					{/* Action buttons */}
					<div className="mt-8">
						<Button
							onClick={handleNext}
							className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
							disabled={!isStepValid() || isLoading}
						>
							{isLoading ? (
								<div className="flex items-center gap-2">
									<div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									Creating your account...
								</div>
							) : (
								<div className="flex items-center justify-center gap-2">
									{isLastStep ? "Complete setup" : "Continue"}
									{isLastStep ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
								</div>
							)}
						</Button>
					</div>

					{/* Security notice */}
					<div className="mt-8 p-4 bg-gray-50 rounded-lg">
						<div className="flex gap-3">
							<Shield className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
							<div className="text-sm text-gray-600">
								<p className="font-medium mb-1">Your information is secure</p>
								<p>
									We use bank-level encryption to protect your data and never share
									your personal information without your consent.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}